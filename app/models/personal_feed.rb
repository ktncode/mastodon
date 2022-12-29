# frozen_string_literal: true

class PersonalFeed
  # @param [Account] account
  # @param [Hash] options
  # @option [Boolean] :with_replies
  def initialize(account, options = {})
    @account = account
    @options = options
  end

  # @param [Integer] limit
  # @param [Integer] max_id
  # @param [Integer] since_id
  # @param [Integer] min_id
  # @return [Array<Status>]
  def get(limit, max_id = nil, since_id = nil, min_id = nil)
    scope = personal_scope

    scope.cache_ids.to_a_paginated_by_id(limit, max_id: max_id, since_id: since_id, min_id: min_id)
  end

  private

  attr_reader :account, :options

  def personal_scope
    Status.include_expired.where(account_id: account.id).without_reblogs.with_personal_visibility
  end
end
