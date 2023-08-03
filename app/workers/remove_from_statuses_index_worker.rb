# frozen_string_literal: true

class RemoveFromStatusesIndexWorker
  include Sidekiq::Worker
  
  sidekiq_options queue: 'pull'

  def perform(account_id)
    account = Account.find(account_id)
  
    return if account.indexable?
  
    account.remove_from_statuses_index!
  rescue ActiveRecord::RecordNotFound
    true
  end
end
