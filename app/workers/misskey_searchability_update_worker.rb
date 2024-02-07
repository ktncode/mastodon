# frozen_string_literal: true

class MisskeySearchabilityUpdateWorker
  include Sidekiq::Worker

  sidekiq_options queue: 'maintenance', lock: :until_executed

  def perform(account_id)
    MisskeySearchabilityUpdateService.new.call(Account.find(account_id))
  rescue ActiveRecord::RecordNotFound
    true
  end
end
