# frozen_string_literal: true

class MisskeySearchabilityUpdateService < BaseService
  def call(account)
    ids = account.statuses.where(searchability: [nil, :private], reblog_of_id: nil).pluck(:id)

    return unless ids.present?
    return unless Chewy.enabled?

    ids.each_slice(100) do |chunk_ids|
      StatusesIndex.import chunk_ids, update_fields: [:searchability]
    end
  end
end
