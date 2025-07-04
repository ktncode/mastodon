# frozen_string_literal: true
# == Schema Information
#
# Table name: notifications
#
#  id              :bigint(8)        not null, primary key
#  activity_id     :bigint(8)        not null
#  activity_type   :string           not null
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#  account_id      :bigint(8)        not null
#  from_account_id :bigint(8)        not null
#  type            :string
#

class Notification < ApplicationRecord
  self.inheritance_column = nil

  include Paginable

  LEGACY_TYPE_CLASS_MAP = {
    'Mention'         => :mention,
    'Status'          => :reblog,
    'Follow'          => :follow,
    'FollowRequest'   => :follow_request,
    'Followed'        => :followed,
    'Favourite'       => :favourite,
    'Poll'            => :poll,
    'EmojiReaction'   => :emoji_reaction,
    'StatusReference' => :status_reference,
    'ScheduledStatus' => :scheduled_status,
  }.freeze

  TYPES = %i(
    mention
    status
    reblog
    follow
    follow_request
    followed
    favourite
    poll
    emoji_reaction
    status_reference
    scheduled_status
  ).freeze

  TARGET_STATUS_INCLUDES_BY_TYPE = {
    status: :status,
    reblog: [status: :reblog],
    mention: [mention: :status],
    favourite: [favourite: :status],
    poll: [poll: :status],
    emoji_reaction: [emoji_reaction: :status],
    status_reference: [status_reference: :status],
  }.freeze

  belongs_to :account, optional: true
  belongs_to :from_account, class_name: 'Account', optional: true
  belongs_to :activity, polymorphic: true, optional: true

  belongs_to :mention,          foreign_key: 'activity_id', optional: true
  belongs_to :status,           foreign_key: 'activity_id', optional: true
  belongs_to :follow,           foreign_key: 'activity_id', optional: true
  belongs_to :follow_request,   foreign_key: 'activity_id', optional: true
  belongs_to :favourite,        foreign_key: 'activity_id', optional: true
  belongs_to :poll,             foreign_key: 'activity_id', optional: true
  belongs_to :emoji_reaction,   foreign_key: 'activity_id', optional: true
  belongs_to :status_reference, foreign_key: 'activity_id', optional: true

  validates :type, inclusion: { in: TYPES }
  validates :activity_id, uniqueness: { scope: [:account_id, :type] }, if: -> { type.to_sym == :status }

  scope :without_suspended, -> { joins(:from_account).merge(Account.without_suspended) }

  scope :browserable, ->(exclude_types = [], account_id = nil) {
    types = TYPES - exclude_types.map(&:to_sym)

    if account_id.nil?
      where(type: types)
    else
      where(type: types, from_account_id: account_id)
    end
  }

  def type
    @type ||= (super || LEGACY_TYPE_CLASS_MAP[activity_type]).to_sym
  end

  def target_status
    case type
    when :status
      status
    when :reblog
      status&.reblog
    when :favourite
      favourite&.status
    when :mention
      mention&.status
    when :poll
      poll&.status
    when :emoji_reaction
      emoji_reaction&.status
    when :status_reference
      status_reference&.status
    when :scheduled_status
      status
    end
  end

  def target_account
    case type
    when :follow
      follow&.target_account
    when :follow_request
      follow_request&.target_account
    when :followed
      follow&.target_account
    else
      target_status&.account
    end
  end

  def reblog_visibility
    type == :reblog && status.present? ? status.visibility : :public
  end

  class << self
    def preload_cache_collection_target_statuses(notifications, &_block)
      notifications.group_by(&:type).each do |type, grouped_notifications|
        associations = TARGET_STATUS_INCLUDES_BY_TYPE[type]
        next unless associations

        # Instead of using the usual `includes`, manually preload each type.
        # If polymorphic associations are loaded with the usual `includes`, other types of associations will be loaded more.
        ActiveRecord::Associations::Preloader.new.preload(grouped_notifications, associations)
      end

      unique_target_statuses = notifications.map(&:target_status).compact.uniq
      # Call cache_collection in block
      cached_statuses_by_id = yield(unique_target_statuses).index_by(&:id)

      notifications.each do |notification|
        next if notification.target_status.nil?

        cached_status = cached_statuses_by_id[notification.target_status.id]

        case notification.type
        when :status
          notification.status = cached_status
        when :reblog
          notification.status.reblog = cached_status
        when :favourite
          notification.favourite.status = cached_status
        when :mention
          notification.mention.status = cached_status
        when :poll
          notification.poll.status = cached_status
        when :emoji_reaction
          notification.emoji_reaction.status = cached_status
        when :status_reference
          notification.status_reference.status = cached_status
        when :scheduled_status
          notification.status = cached_status
        end
      end

      notifications
    end
  end

  after_initialize :set_from_account
  before_validation :set_from_account

  private

  def set_from_account
    return unless new_record?
  
    case type
    when :status, :reblog, :follow, :favourite, :follow_request, :poll, :emoji_reaction, :scheduled_status
      self.from_account_id = activity&.account_id
    when :followed
      self.from_account_id = activity&.target_account_id
    when :mention, :status_reference
      self.from_account_id = activity&.status&.account_id
    end
  end
end
