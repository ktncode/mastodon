# frozen_string_literal: true

class Misskey::CustomEmojiSerializer < ActiveModel::Serializer
  attributes :fileName, :downloaded
  has_one :emoji

  def fileName
    "#{object.shortcode}#{File.extname(object.image_file_name)}"
  end

  def downloaded
    true
  end

  def emoji
    object
  end

  class CustomEmojiSerializer < ActiveModel::Serializer
    include RoutingHelper

    attributes :id, :updateAt, :name, :host, :originalUrl, :publicUrl, :uri, :type, :aliases
    attribute :category, if: :category_loaded?

    def id
      object.id.to_s
    end

    def updateAt
      object.updated_at.iso8601
    end

    def name
      object.shortcode
    end

    def host
      object.domain
    end

    def category
      object.category.name
    end

    def category_loaded?
      object.association(:category).loaded? && object.category.present?
    end

    def originalUrl
      full_asset_url(object.image.url)
    end

    def publicUrl
      full_asset_url(object.image.url)
    end

    def uri
      ActivityPub::TagManager.instance.uri_for(object)
    end

    def type
      object.image_content_type
    end

    def aliases
      ['']
    end
  end
end
