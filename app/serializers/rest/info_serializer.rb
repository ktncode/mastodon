# frozen_string_literal: true

class REST::InfoSerializer < ActiveModel::Serializer
  include RoutingHelper

  attributes :domain, :info, :thumbnail, :thumbnail_static, :blurhash, :thumbhash

  def thumbnail
    full_asset_url(object.thumbnail_original_url)
  end

  def thumbnail_static
    full_asset_url(object.thumbnail_static_url)
  end
end
