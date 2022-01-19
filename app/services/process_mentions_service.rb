# frozen_string_literal: true

class ProcessMentionsService < BaseService
  include Payloadable

  # Scan status for mentions and fetch remote mentioned users, create
  # local mention pointers, send Salmon notifications to mentioned
  # remote users
  # @param [Status] status
  # @param [Circle] circle
  def call(status, circle = nil)
    @status = status

    return unless @status.local?

    @previous_mentions = @status.active_mentions.includes(:account).to_a
    @current_mentions  = []

    Status.transaction do
      scan_text!
      process_circle_and_limited_visibility!(circle)
      assign_mentions!
    end
  end

  private

  def scan_text!
    @status.text = @status.text.gsub(Account::MENTION_RE) do |match|
      username, domain = Regexp.last_match(1).split('@')

      domain = begin
        if TagManager.instance.local_domain?(domain)
          nil
        else
          TagManager.instance.normalize_domain(domain)
        end
      end

      mentioned_account = Account.find_remote(username, domain)

      # If the account cannot be found or isn't the right protocol,
      # first try to resolve it
      if mention_undeliverable?(mentioned_account)
        begin
          mentioned_account = ResolveAccountService.new.call(Regexp.last_match(1))
        rescue Webfinger::Error, HTTP::Error, OpenSSL::SSL::SSLError, Mastodon::UnexpectedResponseError
          mentioned_account = nil
        end
      end

      # If after resolving it still isn't found or isn't the right
      # protocol, then give up
      next match if mention_undeliverable?(mentioned_account) || mentioned_account&.suspended?

      mention   = @previous_mentions.find { |x| x.account_id == mentioned_account.id }
      mention ||= mentioned_account.mentions.new(status: @status)

      @current_mentions << mention

      "@#{mentioned_account.acct}"
    end

    @status.save!
  end

  def process_circle_and_limited_visibility!(circle)
    mentioned_account_ids = @current_mentions.map(&:account_id)

    if circle.present?
      (circle.class.name == 'Account' ? circle.mutuals : circle.accounts).find_each do |target_account|
        silent_mention = @status.mentions.find_or_create_by(silent: true, account: target_account) unless mentioned_account_ids.include?(target_account.id)
        @current_mentions << silent_mention if silent_mention
      end
    elsif @status.limited_visibility? && @status.thread&.limited_visibility?
      # If we are replying to a local status, then we'll have the complete
      # audience copied here, both local and remote. If we are replying
      # to a remote status, only local audience will be copied. Then we
      # need to send our reply to the remote author's inbox for distribution

      @status.thread.mentions.includes(:account).find_each do |mention|
        unless @status.account_id == mention.account_id && mentioned_account_ids.include?(mention.account.id)
          silent_mention = @status.mentions.create(silent: true, account: mention.account)
          @current_mentions << silent_mention
        end
      end

      unless @status.account_id == @status.thread.account_id && mentioned_account_ids.include?(@status.thread.account.id)
        silent_mention = @status.mentions.create(silent: true, account: @status.thread.account)
        @current_mentions << silent_mention
      end
    end

    # Create notifications for mentions
    @current_mentions.each { |mention| create_notification(mention) }
  end

  def assign_mentions!
    @current_mentions.each do |mention|
      mention.save if mention.new_record?
    end

    # If previous mentions are no longer contained in the text, convert them
    # to silent mentions, since withdrawing access from someone who already
    # received a notification might be more confusing
    removed_mentions = @previous_mentions - @current_mentions

    Mention.where(id: removed_mentions.map(&:id)).update_all(silent: true) unless removed_mentions.empty?
  end

  def mention_undeliverable?(mentioned_account)
    mentioned_account.nil? || (!mentioned_account.local? && !mentioned_account.activitypub?)
  end

  def create_notification(mention)
    mentioned_account = mention.account

    if mentioned_account.local? && mentioned_account.group?
      group      = mentioned_account
      visibility = Status.visibilities.key([Status.visibilities[@status.visibility], Status.visibilities[group.user&.setting_default_privacy]].max)

      ReblogService.new.call(group, @status, { visibility: visibility })
    elsif mentioned_account.local?
      LocalNotificationWorker.perform_async(mentioned_account.id, mention.id, mention.class.name, 'mention')
    elsif mentioned_account.activitypub?
      ActivityPub::DeliveryWorker.perform_async(activitypub_json, mention.status.account_id, mentioned_account.inbox_url, { 'synchronize_followers' => !mention.status.distributable? })
    end
  end

  def activitypub_json
    return @activitypub_json if defined?(@activitypub_json)
    @activitypub_json = Oj.dump(serialize_payload(ActivityPub::ActivityPresenter.from_status(@status), ActivityPub::ActivitySerializer, signer: @status.account))
  end
end
