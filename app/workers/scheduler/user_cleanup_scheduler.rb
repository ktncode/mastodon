# frozen_string_literal: true

class Scheduler::UserCleanupScheduler
  include Sidekiq::Worker

  sidekiq_options retry: 0

  def perform
    clean_unconfirmed_accounts!
    clean_suspended_accounts!
  end

  private

  def clean_unconfirmed_accounts!
    User.where('confirmed_at is NULL AND confirmation_sent_at <= ?', 2.days.ago).reorder(nil).find_in_batches do |batch|
      # We have to do it separately because of missing database constraints
      AccountModerationNote.where(target_account_id: batch.map(&:account_id)).delete_all
      WebauthnCredential.where(user_id: batch.map(&:id)).delete_all
      Account.where(id: batch.map(&:account_id)).delete_all
      User.where(id: batch.map(&:id)).delete_all
    end
  end

  def clean_suspended_accounts!
    AccountDeletionRequest.where('created_at <= ?', AccountDeletionRequest::DELAY_TO_DELETION.ago).reorder(nil).find_each do |deletion_request|
      Admin::AccountDeletionWorker.perform_async(deletion_request.account_id)
    end
  end
end
