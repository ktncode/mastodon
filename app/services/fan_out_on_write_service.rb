# frozen_string_literal: true

class FanOutOnWriteService < BaseService
  # Push a status into home and mentions feeds
  # @param [Status] status
  def call(status)
    raise Mastodon::RaceConditionError if status.visibility.nil?

    @feedInsertWorker = status.account.high_priority? ? ::PriorityFeedInsertWorker : FeedInsertWorker

    deliver_to_self(status) if status.account.local? && !(status.direct_visibility? && status.account.user.setting_hide_direct_from_timeline)

    if status.personal_visibility?
      deliver_to_self_included_lists(status) if status.account.local? && !status.account.user.setting_hide_personal_from_timeline
      return
    elsif status.direct_visibility?
      deliver_to_mentioned_followers(status)
      deliver_to_mentioned_lists(status)
      deliver_to_own_conversation(status)
    elsif status.limited_visibility?
      deliver_to_mentioned_followers(status)
      deliver_to_mentioned_lists(status)
    else
      deliver_to_followers(status)
      deliver_to_lists(status)
    end

    if status.account.group?
      if status.reblog?
        render_anonymous_reblog_payload(status)
      else
        render_anonymous_payload(status)
      end

      deliver_to_group(status)
    end

    return if status.account.silenced? || !status.public_visibility?

    render_anonymous_payload(status)

    if !status.reblog? && (!status.reply? || status.in_reply_to_account_id == status.account_id)
      deliver_to_public(status)
      deliver_to_index(status)
      if status.media_attachments.any?
        deliver_to_media(status)
      else
        deliver_to_nomedia(status)
      end
    end

    deliver_to_domain_subscribers(status)
    deliver_to_subscribers(status)
    deliver_to_subscribers_lists(status)

    return if status.reblog?

    deliver_to_hashtags(status)
    deliver_to_hashtag_followers(status)
    deliver_to_keyword_subscribers(status)
  end

  private

  def deliver_to_self(status)
    Rails.logger.debug "Delivering status #{status.id} to author"
    FeedManager.instance.push_to_home(status.account, status)
  end

  def deliver_to_followers(status)
    Rails.logger.debug "Delivering status #{status.id} to followers"

    status.account.followers_for_local_distribution.select(:id).reorder(nil).find_in_batches do |followers|
      @feedInsertWorker.push_bulk(followers) do |follower|
        [status.id, follower.id, :home]
      end
    end
  end

  def deliver_to_subscribers(status)
    Rails.logger.debug "Delivering status #{status.id} to subscribers"

    status.account.subscribers_for_local_distribution.with_reblog(status.reblog?).with_media(status.proper).select(:id, :account_id).reorder(nil).find_in_batches do |subscribings|
      @feedInsertWorker.push_bulk(subscribings) do |subscribing|
        [status.id, subscribing.account_id, :home]
      end
    end
  end

  def deliver_to_subscribers_lists(status)
    Rails.logger.debug "Delivering status #{status.id} to subscribers lists"

    status.account.list_subscribers_for_local_distribution.with_reblog(status.reblog?).with_media(status.proper).select(:id, :list_id).reorder(nil).find_in_batches do |subscribings|
      @feedInsertWorker.push_bulk(subscribings) do |subscribing|
        [status.id, subscribing.list_id, :list]
      end
    end
  end

  def deliver_to_domain_subscribers(status)
    Rails.logger.debug "Delivering status #{status.id} to domain subscribers"

    deliver_to_domain_subscribers_home(status)
    deliver_to_domain_subscribers_list(status)
  end

  def deliver_to_domain_subscribers_home(status)
    DomainSubscribe.domain_to_home(status.account.domain).with_reblog(status.reblog?).with_media(status.proper).select(:id, :account_id).find_in_batches do |subscribes|
      @feedInsertWorker.push_bulk(subscribes) do |subscribe|
        [status.id, subscribe.account_id, :home]
      end
    end
  end

  def deliver_to_domain_subscribers_list(status)
    DomainSubscribe.domain_to_list(status.account.domain).with_reblog(status.reblog?).with_media(status.proper).select(:id, :list_id).find_in_batches do |subscribes|
      @feedInsertWorker.push_bulk(subscribes) do |subscribe|
        [status.id, subscribe.list_id, :list]
      end
    end
  end

  def deliver_to_keyword_subscribers(status)
    Rails.logger.debug "Delivering status #{status.id} to keyword subscribers"

    deliver_to_keyword_subscribers_home(status)
    deliver_to_keyword_subscribers_list(status)
  end

  def deliver_to_keyword_subscribers_home(status)
    match_accounts = []

    KeywordSubscribe.active.with_media(status.proper).without_local_followed_home(status.account).order(:account_id).each do |keyword_subscribe|
      next if match_accounts[-1] == keyword_subscribe.account_id
      match_accounts << keyword_subscribe.account_id if keyword_subscribe.match?(status.searchable_text)
    end

    @feedInsertWorker.push_bulk(match_accounts) do |match_account|
      [status.id, match_account, :home]
    end
  end

  def deliver_to_keyword_subscribers_list(status)
    match_lists = []

    KeywordSubscribe.active.with_media(status.proper).without_local_followed_list(status.account).order(:list_id).each do |keyword_subscribe|
      next if match_lists[-1] == keyword_subscribe.list_id
      match_lists << keyword_subscribe.list_id if keyword_subscribe.match?(status.searchable_text)
    end

    @feedInsertWorker.push_bulk(match_lists) do |match_list|
      [status.id, match_list, :list]
    end
  end

  def deliver_to_lists(status)
    Rails.logger.debug "Delivering status #{status.id} to lists"

    status.account.lists_for_local_distribution.select(:id).reorder(nil).find_in_batches do |lists|
      @feedInsertWorker.push_bulk(lists) do |list|
        [status.id, list.id, :list]
      end
    end
  end

  def hide_direct_account_ids
    User.where(id: Setting.unscoped.where(thing_type: 'User', var: 'hide_direct_from_timeline', value: YAML.dump(true)).select(:thing_id)).select(:account_id)
  end

  def deliver_to_mentioned_followers(status)
    Rails.logger.debug "Delivering status #{status.id} to limited followers"

    mentions = status.mentions.joins(:account).merge(status.account.followers_for_local_distribution)
    mentions = mentions.where.not(account_id: hide_direct_account_ids) if status.direct_visibility?

    mentions.select(:id, :account_id).reorder(nil).find_in_batches do |mentions|
      @feedInsertWorker.push_bulk(mentions) do |mention|
        [status.id, mention.account_id, :home]
      end
    end
  end

  def deliver_to_mentioned_lists(status)
    Rails.logger.debug "Delivering status #{status.id} to lists in limited followers"

    lists = status.account.lists_for_mentioned_local_distribution(status)
    lists = lists.where.not(account_id: hide_direct_account_ids) if status.direct_visibility?

    lists.select(:id).reorder(nil).find_in_batches do |lists|
      @feedInsertWorker.push_bulk(lists) do |list|
        [status.id, list.id, :list]
      end
    end
  end

  def render_anonymous_payload(status)
    return @payload if defined?(@payload)

    @payload = InlineRenderer.render(status, nil, :status)
    @payload = Oj.dump(event: :update, payload: @payload)
  end

  def render_anonymous_reblog_payload(status)
    return @reblog_payload if defined?(@reblog_payload)

    @reblog_payload = InlineRenderer.render(status.reblog, nil, :status)
    @reblog_payload = Oj.dump(event: :update, payload: @reblog_payload)
  end

  def deliver_to_hashtags(status)
    Rails.logger.debug "Delivering status #{status.id} to hashtags"

    status.tags_without_mute.pluck(:name).each do |hashtag|
      Redis.current.publish("timeline:hashtag:#{hashtag.mb_chars.downcase}", @payload)
      Redis.current.publish("timeline:hashtag:nobot:#{hashtag.mb_chars.downcase}", @payload) unless status.account.bot?
    end
  end

  def deliver_to_hashtag_followers(status)
    Rails.logger.debug "Delivering status #{status.id} to hashtag followers"

    deliver_to_hashtag_followers_home(status)
    deliver_to_hashtag_followers_list(status)
  end

  def deliver_to_hashtag_followers_home(status)
    @feedInsertWorker.push_bulk(FollowTag.home.where(tag: status.tags_without_mute).with_media(status.proper).pluck(:account_id).uniq) do |follower|
      [status.id, follower, :home]
    end
  end

  def deliver_to_hashtag_followers_list(status)
    @feedInsertWorker.push_bulk(FollowTag.list.where(tag: status.tags_without_mute).with_media(status.proper).pluck(:list_id).uniq) do |list_id|
      [status.id, list_id, :list]
    end
  end

  def deliver_to_group(status)
    Rails.logger.debug "Delivering status #{status.id} to group timeline"

    payload = status.reblog? ? @reblog_payload : @payload

    Redis.current.publish("timeline:group:#{status.account.id}", payload)

    status.tags.pluck(:name).each do |hashtag|
      Redis.current.publish("timeline:group:#{status.account.id}:#{hashtag.mb_chars.downcase}", payload)
    end

    if status.media_attachments.any?
      Redis.current.publish("timeline:group:media:#{status.account.id}", payload)

      status.tags.pluck(:name).each do |hashtag|
        Redis.current.publish("timeline:group:media:#{status.account.id}:#{hashtag.mb_chars.downcase}", payload)
      end
    else
      Redis.current.publish("timeline:group:nomedia:#{status.account.id}", payload)

      status.tags.pluck(:name).each do |hashtag|
        Redis.current.publish("timeline:group:nomedia:#{status.account.id}:#{hashtag.mb_chars.downcase}", payload)
      end
    end
  end

  def deliver_to_public(status)
    Rails.logger.debug "Delivering status #{status.id} to public timeline"

    Redis.current.publish('timeline:public', @payload)
    Redis.current.publish('timeline:public:nobot', @payload) unless status.account.bot?
    if status.local?
    else
      Redis.current.publish('timeline:public:remote', @payload)
      Redis.current.publish('timeline:public:remote:nobot', @payload) unless status.account.bot?
      Redis.current.publish("timeline:public:domain:#{status.account.domain.mb_chars.downcase}", @payload)
      Redis.current.publish("timeline:public:domain:nobot:#{status.account.domain.mb_chars.downcase}", @payload) unless status.account.bot?
    end
  end

  def deliver_to_index(status)
    Redis.current.publish('timeline:index', @payload) if status.local? && status.public_searchability?
  end

  def deliver_to_media(status)
    Rails.logger.debug "Delivering status #{status.id} to media timeline"

    Redis.current.publish('timeline:public:media', @payload)
    Redis.current.publish('timeline:public:nobot:media', @payload) unless status.account.bot?
    if status.local?
    else
      Redis.current.publish('timeline:public:remote:media', @payload)
      Redis.current.publish('timeline:public:remote:nobot:media', @payload) unless status.account.bot?
      Redis.current.publish("timeline:public:domain:media:#{status.account.domain.mb_chars.downcase}", @payload)
      Redis.current.publish("timeline:public:domain:nobot:media:#{status.account.domain.mb_chars.downcase}", @payload) unless status.account.bot?
    end
  end

  def deliver_to_nomedia(status)
    Rails.logger.debug "Delivering status #{status.id} to no media timeline"

    Redis.current.publish('timeline:public:nomedia', @payload)
    Redis.current.publish('timeline:public:nobot:nomedia', @payload) unless status.account.bot?
    if status.local?
    else
      Redis.current.publish('timeline:public:remote:nomedia', @payload)
      Redis.current.publish('timeline:public:remote:nobot:nomedia', @payload) unless status.account.bot?
      Redis.current.publish("timeline:public:domain:nomedia:#{status.account.domain.mb_chars.downcase}", @payload)
      Redis.current.publish("timeline:public:domain:nobot:nomedia:#{status.account.domain.mb_chars.downcase}", @payload) unless status.account.bot?
    end
  end

  def deliver_to_own_conversation(status)
    AccountConversation.add_status(status.account, status)
  end

  def deliver_to_self_included_lists(status)
    @feedInsertWorker.push_bulk(status.account.self_included_lists.pluck(:id)) do |list_id|
      [status.id, list_id, :list]
    end
  end
end
