# frozen_string_literal: true

class UpdateNodeWorker
  include Sidekiq::Worker

  sidekiq_options queue: 'pull', retry: 5, lock: :until_executed

  sidekiq_retry_in do |count|
    ((count + 1) ** 3) * 240
  end

  def perform(domain, options = {})
    UpdateNodeService.new.call(domain, **options.symbolize_keys)
  rescue Resolv::ResolvError
    true
  end
end
