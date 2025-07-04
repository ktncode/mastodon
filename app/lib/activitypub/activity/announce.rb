# frozen_string_literal: true

class ActivityPub::Activity::Announce < ActivityPub::Activity
  def perform
    return reject_payload! if delete_arrived_first?(@json['id']) || !related_to_local_activity?

    lock_or_fail("announce:#{value_or_id(@object)}") do
      @original_status = status_from_object

      return reject_payload! if @original_status.nil? || !announceable?(@original_status)

      @status = Status.find_by(account: @account, reblog: @original_status)

      if @status.nil?
        process_status
      elsif @options[:delivered_to_account_id].present?
        postprocess_audience_and_deliver
      end
    end

    @status
  end

  private

  def process_status
    @mentions = []
    @params   = {}

    process_status_params
    process_expiry_params
    process_audience

    ApplicationRecord.transaction do
      @status = Status.create!(@params)
      attach_mentions(@status)
    end

    @original_status.tags.each do |tag|
      tag.use!(@account)
    end

    distribute(@status)
    expire_queue_action
  end

  def process_status_params
    @params = begin
      {
        account: @account,
        reblog: @original_status,
        uri: @json['id'],
        created_at: @json['published'],
        override_timestamps: @options[:override_timestamps],
        visibility: visibility_from_audience_with_correction,
        expires_at: @json['expiry'],
        expires_action: :mark,
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

  def attach_mentions(status)
    @mentions.each do |mention|
      mention.status = status
      mention.save
    end
  end

  def expire_queue_action
    @status.status_expire.queue_action if expires_soon?
  end

  def expires_soon?
    expires_at = @status&.status_expire&.expires_at
    expires_at.present? && expires_at <= Time.now.utc + PostStatusService::MIN_SCHEDULE_OFFSET
  end

  def announceable?(status)
    status.account_id == @account.id || (@account.group? && dereferenced?) || status.distributable? || status.account.mutual?(@account)
  end

  def related_to_local_activity?
    fetch? || followed_by_local_accounts? || requested_through_relay? || reblog_of_local_status?
  end

  def requested_through_relay?
    super || Relay.find_by(inbox_url: @account.inbox_url)&.enabled?
  end

  def reblog_of_local_status?
    ActivityPub::TagManager.instance.local_uri?(object_uri) && status_from_uri(object_uri)&.account&.local?
  end
end
