# frozen_string_literal: true

class ActivityPub::Activity::Create < ActivityPub::Activity
  def perform
    dereference_object!

    case @object['type']
    when 'EncryptedMessage'
      create_encrypted_message
    else
      create_status
    end
  rescue Mastodon::RejectPayload
    reject_payload!
  end

  private

  def create_encrypted_message
    return reject_payload! if invalid_origin?(object_uri) || @options[:delivered_to_account_id].blank?

    target_account = Account.find(@options[:delivered_to_account_id])
    target_device  = target_account.devices.find_by(device_id: @object.dig('to', 'deviceId'))

    return if target_device.nil?

    target_device.encrypted_messages.create!(
      from_account: @account,
      from_device_id: @object.dig('attributedTo', 'deviceId'),
      type: @object['messageType'],
      body: @object['cipherText'],
      digest: @object.dig('digest', 'digestValue'),
      message_franking: message_franking.to_token
    )
  end

  def message_franking
    MessageFranking.new(
      hmac: @object.dig('digest', 'digestValue'),
      original_franking: @object['messageFranking'],
      source_account_id: @account.id,
      target_account_id: @options[:delivered_to_account_id],
      timestamp: Time.now.utc
    )
  end

  def reject_pattern
    return @reject_pattern if defined?(@reject_pattern)

    @reject_pattern = Setting.reject_pattern
  end

  def reject_pattern?(text)
    reject_pattern.present? && text&.match?(reject_pattern)
  end

  def create_status
    return reject_payload! if unsupported_object_type? || invalid_origin?(object_uri) || tombstone_exists? || !related_to_local_activity? || reject_pattern?(content)

    lock_or_fail("create:#{object_uri}") do
      return if delete_arrived_first?(object_uri) || poll_vote?

      @status = find_existing_status

      if @status.nil?
        process_status
      elsif @options[:delivered_to_account_id].present?
        postprocess_audience_and_deliver
      end
    end

    @status
  end

  def audience_to
    as_array(@object['to'] || @json['to']).map { |x| value_or_id(x) }
  end

  def audience_cc
    as_array(@object['cc'] || @json['cc']).map { |x| value_or_id(x) }
  end

  def process_status
    @tags                 = []
    @mentions             = []
    @silenced_account_ids = []
    @params               = {}
    @object_links         = []

    process_link_tags
    process_status_params

    raise Mastodon::RejectPayload if MediaAttachment.where(id: @params[:media_attachment_ids]).where(blurhash: Setting.reject_blurhash.split(/\r\n/).filter(&:present?).uniq).present?
    raise Mastodon::RejectPayload if reject_pattern?(MediaAttachment.where(id: @params[:media_attachment_ids]).pluck(:description).join('\n'))

    process_expiry_params
    process_tags
    process_audience

    ApplicationRecord.transaction do
      @status = Status.create!(@params)
      attach_tags(@status)
      attach_mentions(@status)
    end

    resolve_references(@status, @mentions, @object['references'])
    resolve_thread(@status)
    fetch_replies(@status)
    update_status_index(@status)
    distribute(@status)
    distribute_group(@status)
    forward_for_conversation
    forward_for_reply
    expire_queue_action
  end

  def update_status_index(status)
    StatusesIndex.import status if Chewy.enabled?
  rescue
    # Do nothing when the index server is down
  end

  def distribute(status)
    # Spread out crawling randomly to avoid DDoSing the link
    crawl_links(status)

    return unless @options[:delivery]

    notify_about_reblog(status) if reblog_of_local_account?(status) && !reblog_by_following_group_account?(status)
    notify_about_mentions(status)

    # Only continue if the status is supposed to have arrived in real-time.
    # Note that if @options[:override_timestamps] isn't set, the status
    # may have a lower snowflake id than other existing statuses, potentially
    # "hiding" it from paginated API calls
    return unless @options[:override_timestamps] || status.within_realtime_window?

    distribute_to_followers(status)
  end

  def find_existing_status
    status   = status_from_uri(object_uri)
    status ||= Status.find_by(uri: @object['atomUri']) if @object['atomUri'].present?
    status if status&.account_id == @account.id
  end

  def process_status_params
    @status_parser = ActivityPub::Parser::StatusParser.new(@json, followers_collection: @account.followers_url)

    @params = begin
      {
        uri: @status_parser.uri,
        url: @status_parser.url || @status_parser.uri,
        account: @account,
        text: converted_object_type? ? converted_text : (@status_parser.text || add_compatible_content(text_from_content || '')),
        language: @status_parser.language || detected_language,
        spoiler_text: converted_object_type? ? '' : (@status_parser.spoiler_text || text_from_summary || ''),
        created_at: @status_parser.created_at || @object['published'],
        edited_at: @status_parser.edited_at,
        override_timestamps: @options[:override_timestamps],
        reply: @status_parser.reply || @object['inReplyTo'].present?,
        sensitive: @account.sensitized? || @status_parser.sensitive || @object['sensitive'] || false,
        visibility: @status_parser.visibility || visibility_from_audience_with_correction,
        searchability: searchability,
        thread: replied_to_status,
        conversation: conversation_from_context,
        media_attachment_ids: process_attachments.take(Setting.attachments_max).map(&:id),
        poll: process_poll,
        quote: quote,
        generator: generator,
        fetch: !@options[:delivery],
      }
    end
  end

  def process_expiry_params
    expiry = @object['expiry']&.to_time

    if expiry.nil?
      @params
    elsif expiry <= Time.now.utc + PostStatusService::MIN_EXPIRE_OFFSET
      @params.merge!({
        expired_at: @object['expiry']
      })
    else
      @params.merge!({
        expires_at: @object['expiry'],
        expires_action: :mark,
      })
    end
  end

  def process_audience
    # Unlike with tags, there is no point in resolving accounts we don't already
    # know here, because silent mentions would only be used for local access control anyway
    accounts_in_audience = (audience_to + audience_cc).uniq.filter_map do |audience|
      account_from_uri(audience) unless ActivityPub::TagManager.instance.public_collection?(audience)
    end

    # If the payload was delivered to a specific inbox, the inbox owner must have
    # access to it, unless they already have access to it anyway
    if @options[:delivered_to_account_id]
      accounts_in_audience << delivered_to_account
      accounts_in_audience.uniq!
    end

    accounts_in_audience.each do |account|
      # This runs after tags are processed, and those translate into non-silent
      # mentions, which take precedence
      next if @mentions.any? { |mention| mention.account_id == account.id }

      @mentions << Mention.new(account: account, silent: true)

      # If there is at least one silent mention, then the status can be considered
      # as a limited-audience status, and not strictly a direct message, but only
      # if we considered a direct message in the first place
      @params[:visibility] = :limited if @params[:visibility] == :direct
    end

    # Accounts that are tagged but are not in the audience are not
    # supposed to be notified explicitly
    @silenced_account_ids = @mentions.map(&:account_id) - accounts_in_audience.map(&:id)
  end

  def postprocess_audience_and_deliver
    return if @status.mentions.find_by(account_id: @options[:delivered_to_account_id])

    @status.mentions.create(account: delivered_to_account, silent: true)
    @status.update(visibility: :limited) if @status.direct_visibility?

    return unless delivered_to_account.following?(@account)

    FeedInsertWorker.perform_async(@status.id, delivered_to_account.id, :home)
  end

  def delivered_to_account
    @delivered_to_account ||= Account.find(@options[:delivered_to_account_id])
  end

  def attach_tags(status)
    @tags.each do |tag|
      status.tags << tag
      tag.use!(@account, status: status, at_time: status.created_at) if status.public_visibility?
    end

    # Update featured tags
    return if @tags.empty? || !status.distributable?

    @account.featured_tags.where(tag_id: @tags.pluck(:id)).find_each do |featured_tag|
      featured_tag.increment(status.created_at)
    end
  end

  def attach_mentions(status)
    @mentions.each do |mention|
      mention.status = status
      mention.save
    end
  end

  def process_link_tags
    return if @object['tag'].nil?

    as_array(@object['tag']).each do |tag|
      if equals_or_includes?(tag['type'], 'Link')
        process_link tag
      end
    end
  end

  def process_link(tag)
    return if tag['mediaType'] != 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"' || tag['rel'] != "https://misskey-hub.net/ns#_misskey_quote" || tag['href'].blank?
    
    @object_links << tag['href']
  end

  def process_tags
    return if @object['tag'].nil?

    as_array(@object['tag']).each do |tag|
      if equals_or_includes?(tag['type'], 'Hashtag')
        process_hashtag tag
      elsif equals_or_includes?(tag['type'], 'Mention')
        process_mention tag
      elsif equals_or_includes?(tag['type'], 'Emoji')
        process_emoji tag
      end
    end
  end

  def process_hashtag(tag)
    return if tag['name'].blank?

    Tag.find_or_create_by_names(tag['name']) do |hashtag|
      @tags << hashtag unless @tags.include?(hashtag) || !hashtag.valid?
    end
  rescue ActiveRecord::RecordInvalid
    nil
  end

  def explicit_mentions
    @explicit_mentions ||= explicit_mentions_from_text(@params[:text])
  end

  def explicit_mentions_from_text(text)
    return [] if text.blank?

    text.scan(Account::MENTION_RE).map { |match| match.first }.uniq.filter_map do |match|
      username, domain = match.split('@', 2)

      domain = begin
        if TagManager.instance.local_domain?(domain)
          nil
        else
          TagManager.instance.normalize_domain(domain)
        end
      end

      mentioned_account = Account.find_remote(username, domain)

      if mention_undeliverable?(mentioned_account)
        begin
          mentioned_account = ResolveAccountService.new.call(match)
        rescue Webfinger::Error, HTTP::Error, OpenSSL::SSL::SSLError, Mastodon::UnexpectedResponseError
          mentioned_account = nil
        end
      end

      next match if mention_undeliverable?(mentioned_account) || mentioned_account&.suspended?

      mentioned_account
    end
  end

  def mention_undeliverable?(mentioned_account)
    mentioned_account.nil? || (!mentioned_account.local? && mentioned_account.ostatus?)
  end

  def process_mention(tag)
    return if tag['href'].blank?

    account = account_from_uri(tag['href'])
    account = ActivityPub::FetchRemoteAccountService.new.call(tag['href']) if account.nil?

    return if account.nil?
    return if @quote&.account == account && !explicit_mentions.include?(account)

    @mentions << Mention.new(account: account, silent: false)
  end

  def process_emoji(tag)
    return if skip_download?

    custom_emoji_parser = ActivityPub::Parser::CustomEmojiParser.new(tag)

    return if custom_emoji_parser.shortcode.blank? || custom_emoji_parser.image_remote_url.blank?

    emoji = CustomEmoji.find_by(shortcode: custom_emoji_parser.shortcode, domain: @account.domain)

    return unless emoji.nil? || custom_emoji_parser.image_remote_url != emoji.image_remote_url || (custom_emoji_parser.updated_at && custom_emoji_parser.updated_at >= emoji.updated_at)

    begin
      emoji ||= CustomEmoji.new(domain: @account.domain, shortcode: custom_emoji_parser.shortcode, uri: custom_emoji_parser.uri)
      emoji.image_remote_url = custom_emoji_parser.image_remote_url
      emoji.save
    rescue Seahorse::Client::NetworkingError => e
      Rails.logger.warn "Error storing emoji: #{e}"
    end
  end

  def resolve_references(status, mentions, collection)
    references = []
    references = ActivityPub::FetchReferencesService.new.call(status, collection) unless collection.nil?
    ProcessStatusReferenceService.new.call(status, **@options.merge({ mentions: mentions, urls: (references + [quote_uri]).compact.uniq }) )
  end

  def process_attachments
    return [] if @object['attachment'].nil?

    media_attachments = []

    as_array(@object['attachment']).each do |attachment|
      media_attachment_parser = ActivityPub::Parser::MediaAttachmentParser.new(attachment)

      next if media_attachment_parser.remote_url.blank? || media_attachments.size >= 4

      begin
        media_attachment = MediaAttachment.create(
          account: @account,
          remote_url: media_attachment_parser.remote_url,
          thumbnail_remote_url: media_attachment_parser.thumbnail_remote_url,
          description: media_attachment_parser.description,
          focus: media_attachment_parser.focus,
          blurhash: media_attachment_parser.blurhash
        )

        media_attachments << media_attachment

        next if unsupported_media_type?(media_attachment_parser.file_content_type) || skip_download?

        media_attachment.download_file!
        media_attachment.download_thumbnail!
        media_attachment.save
      rescue Mastodon::UnexpectedResponseError, HTTP::TimeoutError, HTTP::ConnectionError, OpenSSL::SSL::SSLError
        RedownloadMediaWorker.perform_in(rand(30..600).seconds, media_attachment.id)
      rescue Seahorse::Client::NetworkingError => e
        Rails.logger.warn "Error storing media attachment: #{e}"
      end
    end

    media_attachments
  rescue Addressable::URI::InvalidURIError => e
    Rails.logger.debug "Invalid URL in attachment: #{e}"
    media_attachments
  end

  def process_poll
    poll_parser = ActivityPub::Parser::PollParser.new(@object)

    return unless poll_parser.valid?

    @account.polls.new(
      multiple: poll_parser.multiple,
      expires_at: poll_parser.expires_at,
      options: poll_parser.options,
      cached_tallies: poll_parser.cached_tallies,
      voters_count: poll_parser.voters_count
    )
  end

  def poll_vote?
    return false if replied_to_status.nil? || replied_to_status.preloadable_poll.nil? || !replied_to_status.local? || !replied_to_status.preloadable_poll.options.include?(@object['name'])

    poll_vote! unless replied_to_status.preloadable_poll.expired?

    true
  end

  def poll_vote!
    poll = replied_to_status.preloadable_poll
    already_voted = true

    lock_or_fail("vote:#{replied_to_status.poll_id}:#{@account.id}") do
      already_voted = poll.votes.where(account: @account).exists?
      poll.votes.create!(account: @account, choice: poll.options.index(@object['name']), uri: object_uri)
    end

    increment_voters_count! unless already_voted
    ActivityPub::DistributePollUpdateWorker.perform_in(3.minutes, replied_to_status.id) unless replied_to_status.preloadable_poll.hide_totals?
  end

  def resolve_thread(status)
    return unless status.reply? && status.thread.nil? && Request.valid_url?(in_reply_to_uri)

    ThreadResolveWorker.perform_async(status.id, in_reply_to_uri)
  end

  def fetch_replies(status)
    collection = @object['replies']
    return if collection.nil?

    replies = ActivityPub::FetchRepliesService.new.call(status, collection, false)
    return unless replies.nil?

    uri = value_or_id(collection)
    ActivityPub::FetchRepliesWorker.perform_async(status.id, uri) unless uri.nil?
  end

  def conversation_from_context
    atom_uri = @object['conversation']

    conversation = begin
      if atom_uri.present? && OStatus::TagManager.instance.local_id?(atom_uri)
        Conversation.find_by(id: OStatus::TagManager.instance.unique_tag_to_local_id(atom_uri, 'Conversation'))
      elsif atom_uri.present? && @object['context'].present?
        Conversation.find_by(uri: atom_uri)
      elsif atom_uri.present?
        begin
          Conversation.find_or_create_by!(uri: atom_uri)
        rescue ActiveRecord::RecordInvalid, ActiveRecord::RecordNotUnique
          retry
        end
      end
    end

    return conversation if @object['context'].nil?

    uri                  = value_or_id(@object['context'])
    context_conversation = ActivityPub::TagManager.instance.uri_to_resource(uri, Conversation)
    conversation       ||= context_conversation

    return conversation if (conversation.present? && (conversation.local? || conversation.uri == uri)) || !uri.start_with?('https://')

    conversation_json = begin
      if @object['context'].is_a?(Hash) && !invalid_origin?(uri)
        @object['context']
      else
        fetch_resource(uri, true)
      end
    end

    return conversation if conversation_json.blank?

    conversation = context_conversation if context_conversation.present?
    conversation ||= Conversation.new
    conversation.uri = uri
    conversation.inbox_url = conversation_json['inbox']
    conversation.save! if conversation.changed?
    conversation
  end

  def replied_to_status
    return @replied_to_status if defined?(@replied_to_status)

    if in_reply_to_uri.blank?
      @replied_to_status = nil
    else
      @replied_to_status   = status_from_uri(in_reply_to_uri)
      @replied_to_status ||= status_from_uri(@object['inReplyToAtomUri']) if @object['inReplyToAtomUri'].present?
      @replied_to_status
    end
  end

  def in_reply_to_uri
    value_or_id(@object['inReplyTo'])
  end

  def content
    return @content if defined?(@content)

    @content =
      if @object['content'].present?
        @object['content']
      elsif content_language_map?
        @object['contentMap'].values.first
      else
        ''
      end

    if quote.nil? && md = @content.match(/QT:\s*\[<a href=\"([^\"]+).*?\]/)
      @quote = quote_from_url(md[1])
      @content.sub!(/QT:\s*\[.*?\]/, '<span class="quote-inline"><br/>\0</span>') if @quote.present?
    end

    @content
  end

  def text_from_content
    return Formatter.instance.linkify([[text_from_name, text_from_summary.presence].compact.join("\n\n"), object_url || object_uri].join(' ')) if converted_object_type?

    if quote.present? && (@object_links.present? || @object['quoteUri'].blank? && @object['_misskey_quote'].present?)
      Formatter.instance.remove_compatible_object_link(content)
    else
      content
    end
  end

  def add_compatible_content(html)
    attachment_count = as_array(@object['attachment']).count

    return html unless !html.include?('original-media-link') && attachment_count > Setting.attachments_max

    Formatter.instance.add_original_link(html, object_url || object_uri, I18n.t('statuses.attached.description', attached: attachment_count))
  end

  def text_from_summary
    if @object['summary'].present?
      @object['summary']
    elsif summary_language_map?
      @object['summaryMap'].values.first
    end
  end

  def text_from_name
    if @object['name'].present?
      @object['name']
    elsif name_language_map?
      @object['nameMap'].values.first
    end
  end

  def converted_text
    Formatter.instance.linkify([@status_parser.title.presence, @status_parser.spoiler_text.presence, @status_parser.url || @status_parser.uri].compact.join("\n\n"))
  end

  def detected_language
    if @status_parser&.language.present?
      @status_parser.language
    elsif content_language_map?
      @object['contentMap'].keys.first
    elsif name_language_map?
      @object['nameMap'].keys.first
    elsif summary_language_map?
      @object['summaryMap'].keys.first
    elsif supported_object_type?
      LanguageDetector.instance.detect(text_from_content, @account)
    end
  end

  def object_url
    return if @object['url'].blank?

    url = url_to_href(@object['url'], 'text/html')
    url unless unsupported_uri_scheme?(url)
  end

  def summary_language_map?
    @object['summaryMap'].is_a?(Hash) && !@object['summaryMap'].empty?
  end

  def content_language_map?
    @object['contentMap'].is_a?(Hash) && !@object['contentMap'].empty?
  end

  def name_language_map?
    @object['nameMap'].is_a?(Hash) && !@object['nameMap'].empty?
  end

  def unsupported_media_type?(mime_type)
    mime_type.present? && !MediaAttachment.supported_mime_types.include?(mime_type)
  end

  def skip_download?
    return @skip_download if defined?(@skip_download)

    @skip_download ||= DomainBlock.reject_media?(@account.domain)
  end

  def reply_to_local?
    !replied_to_status.nil? && replied_to_status.account.local?
  end

  def related_to_local_activity?
    fetch? || followed_by_local_accounts? || requested_through_relay? ||
      responds_to_followed_account? || addresses_local_accounts?
  end

  def responds_to_followed_account?
    !replied_to_status.nil? && (replied_to_status.account.local? || replied_to_status.account.passive_relationships.exists?)
  end

  def addresses_local_accounts?
    return true if @options[:delivered_to_account_id]

    local_usernames = (audience_to + audience_cc).uniq.select { |uri| ActivityPub::TagManager.instance.local_uri?(uri) }.map { |uri| ActivityPub::TagManager.instance.uri_to_local_id(uri, :username) }

    return false if local_usernames.empty?

    Account.local.where(username: local_usernames).exists?
  end

  def tombstone_exists?
    Tombstone.exists?(uri: object_uri)
  end

  def forward_for_conversation
    return unless audience_to.include?(value_or_id(@object['context'])) && @json['signature'].present? && @status.conversation.local?

    ActivityPub::ForwardDistributionWorker.perform_async(@status.conversation_id, Oj.dump(@json))
  end

  def forward_for_reply
    return unless @status.distributable? && @json['signature'].present? && reply_to_local?

    ActivityPub::RawDistributionWorker.perform_async(Oj.dump(@json), replied_to_status.account_id, [@account.preferred_inbox_url])
  end

  def expire_queue_action
    @status.status_expire.queue_action if expires_soon?
  end

  def expires_soon?
    expires_at = @status&.status_expire&.expires_at
    expires_at.present? && expires_at <= Time.now.utc + PostStatusService::MIN_SCHEDULE_OFFSET
  end

  def distribute_group(status)
    return unless @options[:delivery]

    ActivityPub::GroupDistributionWorker.perform_async(status.id) if Account.local.groups.where(id: @status.mentions.select(:account_id)).joins(:passive_relationships).exists?
  end

  def increment_voters_count!
    poll = replied_to_status.preloadable_poll

    unless poll.voters_count.nil?
      poll.voters_count = poll.voters_count + 1
      poll.save
    end
  rescue ActiveRecord::StaleObjectError
    poll.reload
    retry
  end

  def quote_uri
    ActivityPub::TagManager.instance.uri_for(quote) if quote
  end

  def quote
    @quote ||= quote_from_url(@object_links&.first || @object['quoteUri'] || @object['_misskey_quote'])
  end

  def quote_from_url(url)
    return nil if url.nil?

    quote = ResolveURLService.new.call(url, depth: @options[:depth] || 1)
    status_from_uri(quote.uri) if quote
  rescue
    nil
  end

  def generator
    return @generator if defined?(@generator)

    @generator = @object.dig('generator', 'name').nil? ? nil : Generator.find_or_create_by!(
      uri: @object.dig('generator', 'id') || '',
      type: @object.dig('generator', 'type')&.capitalize&.to_sym || :Application,
      name: @object.dig('generator', 'name') || '',
      website: @object.dig('generator', 'url') || '',
    )
  rescue
    nil
  end

  def crawl_links(status)
    return if status.spoiler_text?
    return unless FetchLinkCardService.new.need_fetch?(status)

    # Spread out crawling randomly to avoid DDoSing the link
    random_seconds = rand(1..59).seconds
    redis.sadd("statuses/#{status.id}/processing", 'LinkCrawlWorker')
    redis.expire("statuses/#{status.id}/processing", random_seconds + 60.seconds)
    LinkCrawlWorker.perform_in(random_seconds, status.id)
  end

  def distribute_to_followers(status)
    status.account.high_priority? ?
      PriorityDistributionWorker.perform_async(status.id) :
      DistributionWorker.perform_async(status.id, silenced_account_ids: @silenced_account_ids)
  end

  def notify_about_reblog(status)
    NotifyService.new.call(status.reblog.account, :reblog, status)
  end

  def notify_about_mentions(status)
    status.active_mentions.includes(:account).each do |mention|
      next unless mention.account.local? && audience_includes?(mention.account)
      NotifyService.new.call(mention.account, :mention, mention)
    end
  end

  def reblog_of_local_account?(status)
    status.reblog? && status.reblog.account.local?
  end

  def reblog_by_following_group_account?(status)
    status.reblog? && status.account.group? && status.reblog.account.following?(status.account)
  end
end
