# frozen_string_literal: true

class REST::CompactSearchSerializer < ActiveModel::Serializer
  has_many :accounts, serializer: REST::AccountSerializer
  has_one  :statuses, serializer: REST::CompactStatusesSerializer
  has_many :hashtags, serializer: REST::TagSerializer
  has_many :profiles, serializer: REST::AccountSerializer
end
