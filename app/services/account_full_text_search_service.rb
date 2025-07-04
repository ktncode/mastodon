# frozen_string_literal: true

class AccountFullTextSearchService < BaseService
  def call(query, account, options = {})
    @query   = query&.strip
    @account = account
    @options = options
    @limit   = options.delete(:limit).to_i
    @offset  = options.delete(:offset).to_i

    return if @query.blank? || @limit.zero?

    perform_account_text_search!
  end

  private

  def perform_account_text_search!
    definition = parsed_query.request

    result_ids          = definition.limit(@limit).offset(@offset).pluck(:id).compact
    results             = Account.where(id: result_ids).reorder(nil).order_as_specified(id: result_ids)
    account_ids         = results.map(&:id)
    preloaded_relations = relations_map_for_account(@account&.id, account_ids)

    results.reject { |target_account| AccountSearchFilter.new(target_account, @account, preloaded_relations).filtered? }
  rescue Faraday::ConnectionFailed, Parslet::ParseFailed
    []
  end

  def relations_map_for_account(account_id, account_ids)
    presenter = AccountRelationshipsPresenter.new(account_ids, account_id)
    {
      blocking: presenter.blocking,
      blocked_by: presenter.blocked_by,
      muting: presenter.muting,
      following: presenter.following,
      domain_blocking_by_domain: presenter.domain_blocking,
    }
  end

  def parsed_query
    AccountSearchQueryTransformer.new.apply(SearchQueryParser.new.parse(@query), current_account: @account)
  end
end
