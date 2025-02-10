# frozen_string_literal: true

class REST::CustomEmojiSerializer < ActiveModel::Serializer
  include RoutingHelper

  attributes :shortcode, :url, :static_url, :visible_in_picker

  attribute :category, if: :category_loaded?
  attribute :width, if: :width?
  attribute :height, if: :height?
  attribute :thumbhash, if: :thumbhash?
  attribute :alternate_name, if: :alternate_name?
  attribute :ruby, if: :ruby?
  attribute :aliases, if: :aliases?

  def url
    full_asset_url(object.image.url)
  end

  def static_url
    full_asset_url(object.image.url(:static), ext: '.png')
  end

  def category
    object.category.name
  end

  def category_loaded?
    object.association(:category).loaded? && object.category.present?
  end

  def width
    object.width
  end

  def height
    object.height
  end

  def alternate_name
    object.alternate_name
  end

  def ruby
    object.ruby
  end

  def aliases
    [alternate_name, ruby].concat(object.aliases)&.compact_blank.uniq
  end

  def width?
    !object.width.nil?
  end

  def height?
    !object.height.nil?
  end

  def thumbhash?
    !object.thumbhash.blank?
  end

  def aliases?
    aliases&.present?
  end

  def alternate_name?
    object.alternate_name.present?
  end

  def ruby?
    object.ruby.present?
  end
end
