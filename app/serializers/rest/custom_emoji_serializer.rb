# frozen_string_literal: true

class REST::CustomEmojiSerializer < ActiveModel::Serializer
  include RoutingHelper

  attributes :shortcode, :url, :static_url, :visible_in_picker

  attribute :category, if: :category_loaded?
  attribute :width, if: :width?
  attribute :height, if: :height?
  attribute :thumbhash, if: :thumbhash?

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

  def width?
    !object.width.nil?
  end

  def height?
    !object.height.nil?
  end

  def thumbhash?
    !object.thumbhash.blank?
  end
end
