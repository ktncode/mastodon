# == Schema Information
#
# Table name: generators
#
#  id         :bigint(8)        not null, primary key
#  uri        :string           default(""), not null
#  type       :integer          default(:application), not null
#  name       :string           default(""), not null
#  website    :string
#  created_at :datetime         not null
#  updated_at :datetime         not null
#
class Generator < ApplicationRecord
  self.inheritance_column = false

  enum type: { Application: 0 }, _suffix: :type

  validate :validate_uri_unique

  has_many :statuses, dependent: :nullify, inverse_of: :generator

  private

  def validate_uri_unique
    error.add(:base, :invalid) if uri.present? && Generator.where(uri: uri).exists?
  end
end
