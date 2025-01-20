# frozen_string_literal: true

class Export::CustomEmojiSerializer < ActiveModel::Serializer
  attributes :uri, :shortcode, :filename
  attributes :copy_permission, :license, :misskey_license, :usage_info, :creator, :description, :copyright_notice, :credit_text, :is_based_on, :sensitive, :org_category

  attribute :category, if: :category_loaded?
  attribute :keywords, if: :aliases?
  attribute :related_link, if: :related_link?

  def uri
    ActivityPub::TagManager.instance.uri_for(object)
  end

  def filename
    object.shortcode + File.extname(object.image_file_name)
  end

  def category
    object.category.name
  end

  def category_loaded?
    object.association(:category).loaded? && object.category.present?
  end

  def keywords
    object.aliases&.compact&.join(' ')
  end

  def aliases?
    aliases.present?
  end

  def related_link?
    object.related_link.present?
  end

  def is_based_on
    object.is_based_on
  end
end
