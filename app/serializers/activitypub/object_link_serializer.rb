# frozen_string_literal: true

class ActivityPub::ObjectLinkSerializer < ActivityPub::Serializer
  attributes :type, :media_type, :rel, :href, :name

  def id
    object.id
  end

  def type
    'Link'
  end

  def media_type
    'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
  end

  def rel
    'https://misskey-hub.net/ns#_misskey_quote'
  end

  def href
    object.href
  end

  def name
    object.name
  end
end
