# frozen_string_literal: true

class TagsIndex < Chewy::Index
  settings index: { refresh_interval: '15m' }, analysis: {
    char_filter: {
      tsconvert: {
        type: 'stconvert',
        keep_both: false,
        delimiter: '#',
        convert_type: 't2s',
      },
    },

    analyzer: {
      content: {
        tokenizer: 'keyword',
        filter: %w(lowercase asciifolding cjk_width),
      },

      ko_content: {
        tokenizer: 'nori_user_dict',
        filter: %w(lowercase asciifolding cjk_width),
      },

      zh_content: {
        tokenizer: 'ik_max_word',
        filter: %w(lowercase asciifolding cjk_width),
        char_filter: %w(tsconvert),
      },

      edge_ngram: {
        tokenizer: 'edge_ngram',
        filter: %w(lowercase asciifolding cjk_width),
      },
    },

    tokenizer: {
      edge_ngram: {
        type: 'edge_ngram',
        min_gram: 2,
        max_gram: 15,
      },

      kuromoji_user_dict: {
        type: 'kuromoji_tokenizer',
        user_dictionary: 'userdic.txt',
      },

      nori_user_dict: {
        type: 'nori_tokenizer',
        decompound_mode: 'mixed',
      },
    },
  }

  index_scope ::Tag.listable, delete_if: ->(tag) { tag.destroyed? || !tag.listable? }

  root date_detection: false do
    field :name, type: 'text', analyzer: 'content' do
      field :edge_ngram, type: 'text', analyzer: 'edge_ngram', search_analyzer: 'content'
      field :ko_stemmed, type: 'text', analyzer: 'ko_content', search_analyzer: 'content'
      field :zh_stemmed, type: 'text', analyzer: 'zh_content', search_analyzer: 'content'
    end

    field :reviewed, type: 'boolean', value: ->(tag) { tag.reviewed? }
    field :usage, type: 'long', value: ->(tag) { tag.history.reduce(0) { |total, day| total + day[:accounts].to_i } }
    field :last_status_at, type: 'date', value: ->(tag) { tag.last_status_at || tag.created_at }
  end
end
