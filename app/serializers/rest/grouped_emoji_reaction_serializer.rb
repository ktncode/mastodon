# frozen_string_literal: true

class REST::GroupedEmojiReactionSerializer < ActiveModel::Serializer
  include RoutingHelper
  
  attributes :name, :count

  attribute :me, if: :current_user?
  attribute :url, if: :custom_emoji?
  attribute :static_url, if: :custom_emoji?
  attribute :domain, if: :custom_emoji?
  attribute :width, if: :width?
  attribute :height, if: :height?
  attribute :alternate_name, if: :alternate_name?
  attribute :ruby, if: :ruby?
  attribute :account_ids, if: :has_account_ids?

  def count
    object.respond_to?(:count) ? object.count : 0
  end

  def current_user?
    !current_user.nil?
  end

  def custom_emoji?
    object.custom_emoji.present?
  end

  def has_account_ids?
    object.respond_to?(:account_ids)
  end

  def url
    full_asset_url(object.custom_emoji.image.url)
  end

  def static_url
    full_asset_url(object.custom_emoji.image.url(:static))
  end

  def domain
    object.custom_emoji.domain
  end

  def width
    object.custom_emoji.width
  end

  def height
    object.custom_emoji.height
  end

  def alternate_name
    object.custom_emoji.alternate_name
  end

  def ruby
    object.custom_emoji.ruby
  end

  def width?
    custom_emoji? && object.custom_emoji.width
  end

  def height?
    custom_emoji? && object.custom_emoji.height
  end

  def alternate_name?
    custom_emoji? && object.custom_emoji.alternate_name.present?
  end

  def ruby?
    custom_emoji? && object.custom_emoji.ruby.present?
  end
end
