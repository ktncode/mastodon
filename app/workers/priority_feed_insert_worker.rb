# frozen_string_literal: true

class PriorityFeedInsertWorker < FeedInsertWorker
  sidekiq_options queue: 'priority'
end
