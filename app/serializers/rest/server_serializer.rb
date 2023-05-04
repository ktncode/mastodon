# frozen_string_literal: true

class REST::ServerSerializer < ActiveModel::Serializer
  include RoutingHelper

  attributes :domain, :software, :version, :upstream, :upstream_version, :description, :languages, :region, :categories, :proxied_thumbnail, :blurhash, :thumbhash,
             :total_users, :last_week_users, :registrations, :approval_required, :language, :category

  def proxied_thumbnail
    full_asset_url(object.thumbnail_original_url)
  end

  def language
    object.languages&.first
  end

  def category
    object.categories&.first
  end
end
