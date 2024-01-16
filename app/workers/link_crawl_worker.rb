# frozen_string_literal: true

class LinkCrawlWorker
  include Sidekiq::Worker

  sidekiq_options queue: 'pull', retry: 0

  def perform(status_id)
    FetchLinkCardService.new.call(Status.find(status_id))
  rescue ActiveRecord::RecordNotFound, ActiveRecord::RecordNotUnique
    true
  ensure
    done_process(status_id)
  end

  private

  def done_process(status_id)
    Redis.current.srem("statuses/#{status_id}/processing", 'LinkCrawlWorker')
    Redis.current.del("statuses/#{status_id}/processing") if Redis.current.scard("statuses/#{status_id}/processing") <= 0
    StatusStat.find_by(status_id: status_id)&.touch || StatusStat.create!(status_id: status_id)
  end
end
