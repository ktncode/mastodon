# frozen_string_literal: true

class PublishScheduledStatusWorker
  include Sidekiq::Worker
  include Redisable

  sidekiq_options lock: :until_executed

  def perform(scheduled_status_id)
    scheduled_status = ScheduledStatus.find(scheduled_status_id)
    scheduled_status.destroy!

    PostStatusService.new.call(
      scheduled_status.account,
      options_with_objects(scheduled_status.params.with_indifferent_access)
    )

    remove_scheduled_status(scheduled_status)
  rescue ActiveRecord::RecordNotFound, ActiveRecord::RecordInvalid
    true
  end

  def options_with_objects(options)
    options.tap do |options_hash|
      options_hash[:application] = Doorkeeper::Application.find(options_hash.delete(:application_id)) if options[:application_id]
      options_hash[:thread]      = Status.find(options_hash.delete(:in_reply_to_id)) if options_hash[:in_reply_to_id]
      options_hash[:notify]      = true
    end
  end

  def remove_scheduled_status(scheduled_status)
    redis.publish("timeline:#{scheduled_status.account.id}", Oj.dump(event: :scheduled_status, payload: scheduled_status.id.to_s))
  end
end
