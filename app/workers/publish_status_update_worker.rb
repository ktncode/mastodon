# frozen_string_literal: true

class PublishStatusUpdateWorker
  include Sidekiq::Worker
  include Redisable
  include RoutingHelper
  include PublishScope

  def perform(status_id)
    @status  = Status.find(status_id)

    FeedManager.instance.active_accounts.merge(visibility_scope).find_each do |account|
      next if !redis.exists?("subscribed:timeline:#{account.id}") || !account.user.setting_enable_status_reference

      @account = account
      redis.publish("timeline:#{account.id}", payload_json)
    end
  rescue ActiveRecord::RecordNotFound
    true
  end

  private

  def payload
    InlineRenderer.render(@status, @account, :status)
  end

  def payload_json
    @payload_json = Oj.dump(event: :'status.update', payload: payload)
  end

end
