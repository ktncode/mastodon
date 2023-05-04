# frozen_string_literal: true

class REST::NodeSerializer < ActiveModel::Serializer
  include RoutingHelper

  attributes :id, :domain, :software, :version, :upstream, :upstream_version, :description, :languages, :region, :categories, :proxied_icon, :proxied_thumbnail, :blurhash, :thumbhash,
             :total_users, :last_week_users, :registrations, :approval_required, :language, :category,
             :emoji_reaction_type, :emoji_reaction_max, :referencability, :favouritability, :repliabilty, :reblogability

  def id
    object.id.to_s
  end

  def language
    object.languages&.first
  end

  def category
    object.categories&.first
  end

  def emoji_reaction_type
    object.node&.features(:emoji_reaction_type) || :none
  end

  def emoji_reaction_max
    object.node&.features(:emoji_reaction_max) || 1
  end

  def referencability
    object.node&.features(:reference) || :public
  end

  def favouritability
    object.node&.features(:favourite) || :public
  end

  def repliabilty
    object.node&.features(:reply) || :public
  end

  def reblogability
    object.node&.features(:reblog) || :public
  end
end
