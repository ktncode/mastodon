# frozen_string_literal: true

class SearchService < BaseService
  def call(query, account, limit, options = {})
    @query         = query&.strip
    @account       = account
    @options       = options
    @limit         = limit.to_i
    @offset        = options[:type].blank? ? 0 : options[:offset].to_i
    @resolve       = options[:resolve] || false
    @profile       = options[:with_profiles] || false
    @searchability = options[:searchability] || @account.user&.setting_default_search_searchability || 'private'

    default_results.tap do |results|
      next if @query.blank? || @limit.zero?

      if url_query?
        results.merge!(url_resource_results) unless url_resource.nil? || @offset.positive? || (@options[:type].present? && url_resource_symbol != @options[:type].to_sym)
      elsif @query.present?
        results[:accounts] = perform_accounts_search! if account_searchable?
        results[:statuses] = perform_statuses_search! if full_text_searchable?
        results[:hashtags] = perform_hashtags_search! if hashtag_searchable?
        if @profile
          results[:profiles] = perform_accounts_full_text_search! if account_full_text_searchable?
        elsif account_full_text_searchable?
          accounts_count = results[:accounts].count

          if accounts_count == 0
            # @offset -= count_accounts_search!
            results[:accounts] = perform_accounts_full_text_search!
          elsif accounts_count < @limit
            @limit -= accounts_count
            @offset = 0
            results[:accounts] = results[:accounts].concat(perform_accounts_full_text_search!)
          end
        end
      end
    end
  end

  private

  def perform_accounts_search!
    AccountSearchService.new.call(
      @query,
      @account,
      limit: @limit,
      resolve: @resolve,
      offset: @offset,
      language: @options[:language]
    )
  end

  def count_accounts_search!
    AccountSearchService.new.count(
      @query,
      @account,
      language: @options[:language]
    )
  end

  def perform_accounts_full_text_search!
    AccountFullTextSearchService.new.call(
      @query,
      @account,
      limit: @limit,
      resolve: @resolve,
      offset: @offset,
      language: @options[:language]
    )
  end

  def perform_statuses_search!
    privacy_definition = StatusesIndex.filter(term: { searchable_by: @account.id })

    case @searchability
    when 'public'
      privacy_definition = privacy_definition.or(StatusesIndex.filter(term: { searchability: 'public' }))
      privacy_definition = privacy_definition.or(StatusesIndex.filter(terms: { searchability: %w(unlisted private) }).filter(terms: { account_id: following_account_ids})) unless following_account_ids.empty?
    when 'unlisted', 'private'
      privacy_definition = privacy_definition.or(StatusesIndex.filter(terms: { searchability: %w(public unlisted private) }).filter(terms: { account_id: following_account_ids})) unless following_account_ids.empty?
    end

    definition = parsed_query.apply(StatusesIndex)

    if @options[:account_id].present?
      definition = definition.filter(term: { account_id: @options[:account_id] })
    end

    definition = definition.and(privacy_definition)

    if @options[:min_id].present? || @options[:max_id].present?
      range      = {}
      range[:gt] = @options[:min_id].to_i if @options[:min_id].present?
      range[:lt] = @options[:max_id].to_i if @options[:max_id].present?
      definition = definition.filter(range: { id: range })
    end

    result_ids        = definition.limit(@limit).offset(@offset).pluck(:id).compact
    results           = Status.where(id: result_ids)
    account_ids       = results.map(&:account_id)
    account_relations = relations_map_for_account(@account, account_ids)
    status_relations  = relations_map_for_status(@account, results)

    results.reject { |status| StatusFilter.new(status, @account, account_relations, status_relations).filtered? }
  rescue Faraday::ConnectionFailed, Parslet::ParseFailed
    []
  end

  def perform_hashtags_search!
    TagSearchService.new.call(
      @query,
      limit: @limit,
      offset: @offset,
      exclude_unreviewed: @options[:exclude_unreviewed],
      language: @options[:language]
    )
  end

  def default_results
    { accounts: [], hashtags: [], statuses: [], profiles: [] }
  end

  def url_query?
    @resolve && /\Ahttps?:\/\//.match?(@query)
  end

  def url_resource_results
    { url_resource_symbol => [url_resource] }
  end

  def url_resource
    @_url_resource ||= ResolveURLService.new.call(@query, on_behalf_of: @account)
  end

  def url_resource_symbol
    url_resource.class.name.downcase.pluralize.to_sym
  end

  def full_text_searchable?
    return false unless Chewy.enabled?

    statuses_search? && !@account.nil? && !account_search_explicit_pattern? && !hashtag_search_explicit_pattern?
  end

  def account_full_text_searchable?
    return false unless Chewy.enabled?

    (!@profile && account_search? || profiles_search?) && !@account.nil? && !account_search_explicit_pattern? && !hashtag_search_explicit_pattern?
  end

  def account_searchable?
    account_search?
  end

  def hashtag_searchable?
    hashtag_search? && !account_search_explicit_pattern?
  end

  def account_search_explicit_pattern?
    @query.start_with?('@') || @query.include?('@') && "@#{@query}".match?(/\A#{Account::MENTION_RE}\Z/)
  end

  def hashtag_search_explicit_pattern?
    @query.start_with?('#') || @query.match?(/\A#{Tag::HASHTAG_RE}\Z/)
  end

  def account_search?
    @options[:type].blank? || @options[:type] == 'accounts'
  end

  def hashtag_search?
    @options[:type].blank? || @options[:type] == 'hashtags'
  end

  def statuses_search?
    @options[:type].blank? || @options[:type] == 'statuses'
  end

  def profiles_search?
    @options[:type].blank? || @options[:type] == 'profiles'
  end

  def relations_map_for_account(account, account_ids)
    presenter = AccountRelationshipsPresenter.new(account_ids, account)
    {
      blocking: presenter.blocking,
      blocked_by: presenter.blocked_by,
      muting: presenter.muting,
      following: presenter.following,
      domain_blocking_by_domain: presenter.domain_blocking,
    }
  end

  def relations_map_for_status(account, statuses)
    presenter = StatusRelationshipsPresenter.new(statuses, account)
    {
      reblogs_map: presenter.reblogs_map,
      favourites_map: presenter.favourites_map,
      bookmarks_map: presenter.bookmarks_map,
      emoji_reactions_map: presenter.emoji_reactions_map,
      mutes_map: presenter.mutes_map,
      pins_map: presenter.pins_map,
    }
  end

  def parsed_query
    SearchQueryTransformer.new.apply(SearchQueryParser.new.parse(@query))
  end

  def following_account_ids
    return @following_account_ids if defined?(@following_account_ids)

    account_exists_sql     = Account.where('accounts.id = follows.target_account_id').where(searchability: %w(public unlisted private)).reorder(nil).select(1).to_sql
    status_exists_sql      = Status.where('statuses.account_id = follows.target_account_id').where(reblog_of_id: nil).where(searchability: %w(public unlisted private)).reorder(nil).select(1).to_sql
    following_accounts     = Follow.where(account_id: @account.id).merge(Account.where("EXISTS (#{account_exists_sql})").or(Account.where("EXISTS (#{status_exists_sql})")))
    @following_account_ids = following_accounts.pluck(:target_account_id)
  end
end
