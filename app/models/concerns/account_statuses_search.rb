# frozen_string_literal: true

module AccountStatusesSearch
  extend ActiveSupport::Concern
  
  included do
    after_update_commit :enqueue_update_statuses_index, if: :saved_change_to_indexable?
    after_destroy_commit :enqueue_remove_from_statuses_index, if: :indexable?
  end
  
  def enqueue_update_statuses_index
    return if local?

    if indexable?
      enqueue_add_to_statuses_index
    else
      enqueue_remove_from_statuses_index
    end
  end
  
  def enqueue_add_to_statuses_index
    return unless Chewy.enabled?
  
    AddToStatusesIndexWorker.perform_async(id)
  end
  
  def enqueue_remove_from_statuses_index
    return unless Chewy.enabled?
  
    RemoveFromStatusesIndexWorker.perform_async(id)
  end
  
  def add_to_statuses_index!
    return unless Chewy.enabled?

    target_statuses = Status.include_expired.without_reblogs.where(visibility: :public).with_includes.joins(:account).where(account: {id: id, indexable: true}).reorder(nil)
    target_statuses.find_in_batches(batch_size: 100, order: :desc) do |batch|
      StatusesIndex.import batch
    end
  end
  
  def remove_from_statuses_index!
    return unless Chewy.enabled?
  
    target_statuses = Status.include_expired.without_reblogs.where(visibility: :public).with_includes.joins(:account).where(account: {id: id, indexable: false}).reorder(nil)
    target_statuses.find_in_batches(batch_size: 100, order: :desc) do |batch|
      StatusesIndex.import batch, update_fields: [:searchability]
    end
  end
end
