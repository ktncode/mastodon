# frozen_string_literal: true

class ActivityPub::PriorityProcessingWorker < ActivityPub::ProcessingWorker
  sidekiq_options queue: 'priority', backtrace: true, retry: 8
end
