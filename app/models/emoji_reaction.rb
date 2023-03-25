# frozen_string_literal: true

# == Schema Information
#
# Table name: emoji_reactions
#
#  id              :bigint(8)        not null, primary key
#  account_id      :bigint(8)        not null
#  status_id       :bigint(8)        not null
#  name            :string           default(""), not null
#  custom_emoji_id :bigint(8)
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#  uri             :string
#

class EmojiReaction < ApplicationRecord
  include Paginable

  after_commit :queue_publish
  after_commit :refresh_status

  belongs_to :account
  belongs_to :status, -> { unscope(where: :expired_at) }, inverse_of: :emoji_reactions 
  belongs_to :custom_emoji, optional: true

  has_one :notification, as: :activity, dependent: :destroy

  scope :local, -> { where(uri: nil) }
  scope :remote, -> { where.not(uri: nil) }

  validates :name, presence: true
  validates_with EmojiReactionValidator

  before_validation do
    self.status = status.reblog if status&.reblog?
  end

  def sign?
    true
  end

  def object_type
    :emoji_reaction
  end

  def unicode?
    custom_emoji_id.nil?
  end

  def custom?
    !custom_emoji_id.nil?
  end

  private

  def queue_publish
    PublishEmojiReactionWorker.perform_async(status_id, account_id, name) unless status.destroyed? || account.silenced?
  end

  def refresh_status
    status.refresh_grouped_emoji_reactions! unless status.destroyed?
  end
end
