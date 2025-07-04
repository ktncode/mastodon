# frozen_string_literal: true

class REST::FeaturedTagSerializer < ActiveModel::Serializer
  include RoutingHelper

  attributes :id, :name, :url, :statuses_count, :last_status_at

  def id
    object.id.to_s
  end

  def url
    object.account.local? ? short_account_tag_url(object.account, object.tag) : object.url
  end
end
