# frozen_string_literal: true

class ProcessHashtagsService < BaseService
  def call(status, raw_tags = [])
    @status        = status
    @account       = status.account
    @raw_tags      = status.local? ? Extractor.extract_hashtags(status.text) : raw_tags
    @previous_tags = status.tags.to_a
    @current_tags  = []

    assign_tags!
    update_featured_tags!
    process_time_limit! if status.local?
  end

  private

  def assign_tags!
    @status.tags = @current_tags = Tag.find_or_create_by_names(@raw_tags)
    
    @current_tags.each do |tag|
      tag.use!(@account, status: @status, at_time: @status.created_at) if @status.public_visibility? && !tag.name.match(TimeLimit::TIME_LIMIT_RE)
    end
  end

  def update_featured_tags!
    return unless @status.distributable?

    added_tags = @current_tags - @previous_tags

    unless added_tags.empty?
      @account.featured_tags.where(tag_id: added_tags.map(&:id)).each do |featured_tag|
        featured_tag.increment(@status.created_at)
      end
    end

    removed_tags = @previous_tags - @current_tags

    unless removed_tags.empty?
      @account.featured_tags.where(tag_id: removed_tags.map(&:id)).each do |featured_tag|
        featured_tag.decrement(@status.id)
      end
    end
  end

  def process_time_limit!
    time_limit = TimeLimit.from_status(@status)
    if time_limit.present?
      @status.update(expires_at: time_limit.to_datetime, expires_action: :mark)
    end
  end
end
