# frozen_string_literal: true

class ActivityPub::EmojiSerializer < ActivityPub::Serializer
  include RoutingHelper

  context_extensions :emoji, :category, :copy_permission, :license, :keywords, :related_link, :usage_info, :copyright_notice, :credit_text, :is_based_on, :sensitive, :_misskey_license, :free_text

  class MisskeyLicensePresenter < ActiveModelSerializers::Model
    attributes :freeText
  end
  
  class MisskeyLicenseSerializer < ActivityPub::Serializer
    attributes :freeText
  end
  
  attributes :id, :type, :name, :updated
  attribute :category, if: :category_loaded?
  attribute :copy_permission, if: :copy_permission?
  attribute :license, if: :license?
  attribute :keywords, if: :keywords?
  attribute :related_links, if: :related_links?
  attribute :usage_info, if: :usage_info?
  attribute :creator, if: :creator?
  attribute :description, if: :description?
  attribute :copyright_notice, if: :copyright_notice?
  attribute :credit_text, if: :credit_text?
  attribute :is_based_on, if: :is_based_on?
  attribute :sensitive, if: :sensitive?
  attribute :misskey_license, key: :_misskey_license, serializer: MisskeyLicenseSerializer

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

  def category
    object.category.name
  end

  def license
    object.license
  end

  def keywords
    object.aliases
  end

  def related_links
    object.related_links
  end

  def usage_info
    object.usage_info
  end

  def misskey_license
    MisskeyLicensePresenter.new(freeText: object.misskey_license.presence || Formatter.instance.format_misskey_license(object))
  end

  def creator
    object.creator
  end

  def description
    object.description
  end

  def copyright_notice
    object.copyright_notice
  end

  def credit_text
    object.credit_text
  end

  def is_based_on
    object.is_based_on
  end

  def sensitive
    object.sensitive
  end

  def category_loaded?
    object.association(:category).loaded? && object.category.present?
  end

  def copy_permission?
    !object.none_permission?
  end

  def license?
    object.license.present?
  end

  def keywords?
    object.aliases.present?
  end

  def related_links?
    object.related_links.present?
  end

  def usage_info?
    object.usage_info.present?
  end

  def creator?
    object.creator.present?
  end

  def description?
    object.description.present?
  end

  def copyright_notice?
    object.copyright_notice.present?
  end

  def credit_text?
    object.credit_text.present?
  end

  def is_based_on?
    object.is_based_on.present?
  end

  def sensitive?
    object.sensitive.present?
  end
end
