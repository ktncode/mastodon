# frozen_string_literal: true

class PriorityDistributionWorker < DistributionWorker
  sidekiq_options queue: 'priority'
end
