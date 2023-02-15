# frozen_string_literal: true

class ActivityPub::GeneratorSerializer < ActiveModel::Serializer
  include RoutingHelper

  attributes :id, :type, :name, :url

  def id
    generator_url(object)
  end

  def type
    'Application'
  end

  def name
    object.name || ''
  end

  def url
    object.website || ''
  end
end

