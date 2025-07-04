# frozen_string_literal: true

class TagSearchService < BaseService
  def call(query, options = {})
    @query = query.strip.delete_prefix('#')

    return Tag.none unless @query.match?(Tag::HASHTAG_NAME_RE)

    @offset  = options.delete(:offset).to_i
    @limit   = options.delete(:limit).to_i
    @lang    = options.delete(:language).to_s
    @fields  = ['name'].push(%w(ko zh).include?(@lang) ? "name.#{@lang}_stemmed" : 'name.edge_ngram')
    @options = options

    results   = from_elasticsearch if Chewy.enabled?
    results ||= from_database

    results
  end

  private

  def from_elasticsearch
    query = {
      function_score: {
        query: {
          multi_match: {
            query: @query,
            fields: @fields,
            type: 'most_fields',
            operator: 'and',
          },
        },

        functions: [
          {
            field_value_factor: {
              field: 'usage',
              modifier: 'log2p',
              missing: 0,
            },
          },

          {
            gauss: {
              last_status_at: {
                scale: '7d',
                offset: '14d',
                decay: 0.5,
              },
            },
          },
        ],

        boost_mode: 'multiply',
      },
    }

    filter = {
      bool: {
        should: [
          {
            term: {
              reviewed: {
                value: true,
              },
            },
          },

          {
            match: {
              name: {
                query: @query,
              },
            },
          },
        ],
      },
    }

    definition = TagsIndex.query(query)
    definition = definition.filter(filter) if @options[:exclude_unreviewed]

    definition.limit(@limit).offset(@offset).objects.compact
  rescue Faraday::ConnectionFailed, Parslet::ParseFailed
    nil
  end

  def from_database
    Tag.search_for(@query, @limit, @offset, @options)
  end
end
