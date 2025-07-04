# frozen_string_literal: true
# == Schema Information
#
# Table name: featured_tags
#
#  id             :bigint(8)        not null, primary key
#  account_id     :bigint(8)
#  tag_id         :bigint(8)
#  statuses_count :bigint(8)        default(0), not null
#  last_status_at :datetime
#  created_at     :datetime         not null
#  updated_at     :datetime         not null
#  url            :string
#

class FeaturedTag < ApplicationRecord
  belongs_to :account, inverse_of: :featured_tags
  belongs_to :tag, inverse_of: :featured_tags, optional: true # Set after validation

  validate :validate_tag_name, on: :create
  validate :validate_featured_tags_limit, on: :create

  before_create :set_tag
  before_create :reset_data

  # scope :by_name, ->(name) { joins(:tag).where(tag: { name: HashtagNormalizer.new.normalize(name) }) }
  scope :by_name, ->(name) { joins(:tag).where(tag: { name: name }) }

  # delegate :display_name, to: :tag

  attr_writer :name

  LIMIT = 30

  def sign?
    true
  end

  def name
    tag_id.present? ? tag.name : @name
  end

  def increment(timestamp)
    update(statuses_count: statuses_count + 1, last_status_at: timestamp)
  end

  def decrement(deleted_status_id)
    update(statuses_count: [0, statuses_count - 1].max, last_status_at: account.statuses.where(visibility: %i(public unlisted)).tagged_with(tag).where.not(id: deleted_status_id).select(:created_at).first&.created_at)
  end

  def recount
    reset_data
    save
  end

  private

  def set_tag
    self.tag = Tag.find_or_create_by_names(@name)&.first
  end

  def reset_data
    self.statuses_count = account.statuses.where(visibility: %i(public unlisted)).tagged_with(tag).count
    self.last_status_at = account.statuses.where(visibility: %i(public unlisted)).tagged_with(tag).select(:created_at).first&.created_at
  end

  def validate_featured_tags_limit
    return unless account.local?

    errors.add(:base, I18n.t('featured_tags.errors.limit')) if account.featured_tags.count >= LIMIT
  end

  def validate_tag_name
    errors.add(:name, :blank) if @name.blank?
    errors.add(:name, :invalid) unless @name.match?(Tag::HASHTAG_NAME_RE)
    errors.add(:name, :taken) if FeaturedTag.by_name(@name).where(account_id: account_id).exists?
  end

end
