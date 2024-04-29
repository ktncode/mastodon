# frozen_string_literal: true

class AccountSearchQueryTransformer < Parslet::Transform
  SUPPORTED_FILTER_PREFIXES = %w(
  ).freeze

  SUPPORTED_ORDER_PREFIXES = %w(
    order
  ).freeze

  SUPPORTED_PREFIXES = SUPPORTED_FILTER_PREFIXES + SUPPORTED_ORDER_PREFIXES

  class Query
    def initialize(clauses, options = {})
      raise ArgumentError if options[:current_account].nil?

      @field = %w(ja ko zh).include?(options[:language]) ? "text.#{options[:language]}_stemmed" : 'text.en_stemmed'

      @clauses = clauses
      @options = options
    end

    def request
      search = AccountsIndex.filter(term: { discoverable: true })

      must_clauses.each     { |clause| search = search.query.must(clause.to_query(@field)) }
      must_not_clauses.each { |clause| search = search.query.must_not(clause.to_query(@field)) }
      order_clauses.each    { |clause| search = search.order(**clause.to_query) }

      search.query.minimum_should_match(1)
    end

    def clauses_by_operator
      @clauses_by_operator ||= @clauses.compact.group_by(&:operator)
    end

    def flags_from_clauses!
      @flags = clauses_by_operator.fetch(:flag, []).to_h { |clause| [clause.prefix, clause.term] }
    end

    def must_clauses
      clauses_by_operator.fetch(:must, [])
    end

    def must_not_clauses
      clauses_by_operator.fetch(:must_not, [])
    end

    def order_clauses
      clauses_by_operator.fetch(:order, [OrderPrefixClause.new('order', nil, 'desc')])
    end
  end

  class Operator
    class << self
      def symbol(str)
        case str
        when '+', nil
          :must
        when '-'
          :must_not
        else
          raise "Unknown operator: #{str}"
        end
      end
    end
  end

  class TermsClause
    attr_reader :operator, :terms

    def initialize(operator, terms)
      @operator = Operator.symbol(operator)
      @terms = terms
    end

    def to_query(field)
      { bool: { must: { bool: { should: @terms.map { |term| { match: { field => { query: term[:term].to_s, operator: :and } } } }, minimum_should_match: 1 } } } }
    end
  end

  class TermClause
    attr_reader :operator, :term

    def initialize(operator, term)
      @operator = Operator.symbol(operator)
      @term = term
    end

    def to_query(field)
      { match: { field => { query: @term, operator: :and } } }
    end
  end

  class PhraseClause
    attr_reader :operator, :phrase

    def initialize(operator, phrase)
      @operator = Operator.symbol(operator)
      @phrase = phrase
    end

    def to_query(field)
      if @phrase.is_a?(Array)
        { bool: { must: { bool: { should: @phrase.map { |phrase| { match_phrase: { text: { query: phrase } } } }, minimum_should_match: 1 } } } }
      else
        { match_phrase: { text: { query: @phrase } } }
      end
    end
  end

  class WildcardClause
    attr_reader :operator, :wildcard

    def initialize(operator, wildcard)
      @operator = Operator.symbol(operator)
      @wildcard = wildcard
    end

    def to_query(field)
      if @wildcard.is_a?(Array)
        { bool: { must: { bool: { should: @wildcard.map { |wildcard| { wildcard: { 'text.wildcard': { value: "*#{@wildcard}*", case_insensitive: true } } } }, minimum_should_match: 1 } } } }
      else
        { wildcard: { 'text.wildcard': { value: "*#{@wildcard}*", case_insensitive: true } } }
      end
    end
  end

  class PrefixClause
    attr_reader :operator, :prefix, :term

    def initialize(prefix, operator, term, options = {})
      @prefix = prefix
      @negated = operator == '-'
      @options = options
      @operator = :filter

      case prefix
      when 'from'
      else
      end
    end

    def to_query
      if @negated
        { bool: { must_not: { @type => { @filter => @term } } } }
      else
        { @type => { @filter => @term } }
      end
    end
  end

  class OrderPrefixClause
    attr_reader :operator, :prefix, :term

    def initialize(prefix, operator, term, options = {})
      @prefix = prefix
      @negated = operator == '-'
      @options = options
      @operator = :order

      case prefix
      when 'order'
        raise "Unknown order: #{term}" unless %w(asc desc).include?(term)

        @term = term
      else
        raise "Unknown prefix: #{prefix}"
      end

      def to_query
        { last_status_at: @term }
      end
    end
  end

  rule(clause: subtree(:clause)) do
    prefix   = clause[:prefix][:term].to_s if clause[:prefix]
    operator = clause[:operator]&.to_s

    if clause[:prefix] && SUPPORTED_FILTER_PREFIXES.include?(prefix)
      PrefixClause.new(prefix, operator, clause[:term].to_s, current_account: current_account)
    elsif clause[:prefix] && SUPPORTED_ORDER_PREFIXES.include?(prefix)
      OrderPrefixClause.new(prefix, operator, clause[:term].to_s, current_account: current_account)
    elsif clause[:terms]
      TermsClause.new(operator, clause[:terms])
    elsif clause[:term]
      TermClause.new(operator, clause[:term].to_s)
    elsif clause[:shortcode]
      TermClause.new(operator, ":#{clause[:term]}:")
    elsif clause[:phrases]
      PhraseClause.new(operator, clause[:phrases].map { |phrase| phrase[:phrase].is_a?(Array) ? phrase[:phrase].map { |p| p[:term].to_s }.join(' ') : clause[:phrase].to_s })
    elsif clause[:phrase]
      PhraseClause.new(operator, clause[:phrase].is_a?(Array) ? clause[:phrase].map { |p| p[:term].to_s }.join(' ') : clause[:phrase].to_s)
    elsif clause[:wildcards]
      WildcardClause.new(operator, clause[:wildcards].map { |wildcard| clause[:wildcard].is_a?(Array) ? wildcard[:wildcard].map { |wildcard| wildcard[:term].to_s }.join(' ') : nil }.compact)
    elsif clause[:wildcard]
      WildcardClause.new(operator, clause[:wildcard].is_a?(Array) ? clause[:wildcard].map { |term| term[:term].to_s }.join(' ') : nil)
    else
      raise "Unexpected clause type: #{clause}"
    end
  end

  rule(junk: subtree(:junk)) do
    nil
  end

  rule(query: sequence(:clauses)) do
    Query.new(clauses, language: 'ja', current_account: current_account)
  end
end
