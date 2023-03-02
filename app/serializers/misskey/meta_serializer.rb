# frozen_string_literal: true

class Misskey::MetaSerializer < ActiveModel::Serializer
  attributes :metaVersion, :host, :exportedAt
  has_many :emojis, serializer: Misskey::CustomEmojiSerializer

  def metaVersion
    2
  end

  def host
    Rails.configuration.x.local_domain
  end

  def exportedAt
    Time.now.iso8601
  end

  def emojis
    object
  end
end
