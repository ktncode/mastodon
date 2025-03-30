# frozen_string_literal: true

class StatusReferenceResolveWorker
  include Sidekiq::Worker
  include ExponentialBackoff
  include Redisable

  sidekiq_options queue: 'pull', retry: 3

  def perform(status_id, reference_url, options = {})
    status        = Status.find(status_id)
    target_status = FetchRemoteStatusService.new.call(reference_url, **options)

    return if target_status.nil? || !(target_status.distributable? || target_status&.private_visibility?)

    EntityCache.instance.update_holding_status(reference_url, target_status)
    reference = StatusReference.create!(status_id: status.id, target_status_id: target_status.id)
    NotifyService.new.call(reference.target_status.account, :status_reference, reference) if reference.target_status.account.local?
  rescue ActiveRecord::RecordNotFound, ActiveRecord::RecordInvalid
    true
  ensure
    redis.srem("status_resolve:#{status_id}", reference_url)

    if redis.scard("status_resolve:#{status_id}") == 0
      PublishStatusUpdateWorker.perform_async(status_id) unless !status.nil? && redis.smembers("status_references:#{status_id}") == status.references.map(&:id)
      redis.del("status_resolve:#{status_id}")
      redis.del("status_references:#{status_id}")
    end
  end
end
