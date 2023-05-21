# frozen_string_literal: true

class ActivityPub::EmojiSerializer < ActivityPub::Serializer
  include RoutingHelper

  context_extensions :emoji, :copy_permission, :license, :keywords, :usage_info, :is_based_on

  attributes :id, :type, :name, :updated
  attribute :copy_permission, if: :copy_permission?
  attribute :license, if: :license?
  attribute :keywords, if: :keywords?
  attribute :usage_info, if: :usage_info?
  attribute :author, if: :author?
  attribute :description, if: :description?
  attribute :is_based_on, if: :is_based_on?

  has_one :icon

  class RemoteImageSerializer < ActivityPub::ImageSerializer
    def url
      object.instance.image_remote_url
    end
  end
  
  def self.serializer_for(model, options)
    case model.class.name
    when 'Paperclip::Attachment'
      if model.instance.local?
        ActivityPub::ImageSerializer
      else
        RemoteImageSerializer
      end
    else
      super
    end
  end
  
  def id
    ActivityPub::TagManager.instance.uri_for(object)
  end

  def type
    'Emoji'
  end

  def icon
    object.image
  end

  def updated
    object.updated_at.iso8601
  end

  def name
    ":#{object.shortcode}:"
  end

  def license
    object.meta['license']
  end

  def keywords
    object.aliases
  end

  def usage_info
    object.meta['usage_info']
  end

  def author
    object.meta['author']
  end

  def description
    object.meta['description']
  end

  def is_based_on
    object.meta['is_based_on']
  end

  def copy_permission?
    !object.none_permission?
  end

  def license?
    object.meta['license'].present?
  end

  def keywords?
    object.aliases.present?
  end

  def usage_info?
    object.meta['usage_info'].present?
  end

  def author?
    object.meta['author'].present?
  end

  def description?
    object.meta['description'].present?
  end

  def is_based_on?
    object.meta['is_based_on'].present?
  end
end
