# frozen_string_literal: true

class ActivityPub::UpdateDistributionWorker < ActivityPub::RawDistributionWorker
  include Payloadable

  sidekiq_options queue: 'push', lock: :until_executed

  # Distribute an profile update to servers that might have a copy
  # of the account in question
  def perform(account_id, options = {})
    @options = options.with_indifferent_access
    @account = Account.find(account_id)

    ActivityPub::DeliveryWorker.push_bulk(inboxes) do |inbox_url|
      [signed_payload, @account.id, inbox_url]
    end

    ActivityPub::DeliveryWorker.push_bulk(Relay.enabled.pluck(:inbox_url)) do |inbox_url|
      [signed_payload, @account.id, inbox_url]
    end
  rescue ActiveRecord::RecordNotFound
    true
  end

  private

  def inboxes
    @inboxes ||= @account.delivery_followers.inboxes
  end

  def signed_payload
    @signed_payload ||= Oj.dump(serialize_payload(@account, ActivityPub::UpdateSerializer, signer: @account, sign_with: @options[:sign_with]))
  end
end
