# frozen_string_literal: true
# == Schema Information
#
# Table name: tag_account_mutes
#
#  id         :bigint(8)        not null, primary key
#  tag_id     :bigint(8)
#  account_id :bigint(8)
#  created_at :datetime         not null
#  updated_at :datetime         not null
#
class TagAccountMute < ApplicationRecord
  belongs_to :account, inverse_of: :tag_account_mute_relationships, required: true
  belongs_to :tag, inverse_of: :tag_account_mute_relationships, required: true

  validates :account_id, uniqueness: { scope: :tag_id }
end
