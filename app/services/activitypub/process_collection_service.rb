# frozen_string_literal: true

class ActivityPub::ProcessCollectionService < BaseService
  include JsonLdHelper

  def call(body, account, **options)
    @account = account
    @json    = original_json = Oj.load(body, mode: :strict)
    @options = options

    begin
      @json = compact(@json) if @json['signature'].is_a?(Hash)
    rescue JSON::LD::JsonLdError => e
      Rails.logger.debug "Error when compacting JSON-LD document for #{value_or_id(@json['actor'])}: #{e.message}"
      @json = original_json.without('signature')
    end

    return if !supported_context? || (different_actor? && verify_account!.nil?) || suspended_actor? || @account.local?

    if @json['signature'].present?
      # We have verified the signature, but in the compaction step above, might
      # have introduced incompatibilities with other servers that do not
      # normalize the JSON-LD documents (for instance, previous Mastodon
      # versions), so skip redistribution if we can't get a safe document.
      patch_for_forwarding!(original_json, @json)
      @json.delete('signature') unless safe_for_forwarding?(original_json, @json)
    end

    case @json['type']
    when 'Collection', 'CollectionPage'
      process_items as_array(@json['items'].presence || @json['orderedItems'].presence || [])
    when 'OrderedCollection', 'OrderedCollectionPage'
      process_items as_array(@json['orderedItems'].presence || @json['items'].presence || [])
    else
      process_items [@json]
    end
  rescue Oj::ParseError
    nil
  end

  private

  def different_actor?
    @json['actor'].present? && value_or_id(@json['actor']) != @account.uri
  end

  def suspended_actor?
    @account.suspended? && !activity_allowed_while_suspended?
  end

  def activity_allowed_while_suspended?
    %w(Delete Reject Undo Update).include?(@json['type'])
  end

  def process_items(items)
    items.reverse_each.filter_map { |item| process_item(item) }
  end

  def supported_context?
    super(@json)
  end

  def process_item(item)
    activity = ActivityPub::Activity.factory(item, @account, **@options.merge(delivery: true))
    activity&.perform
  end

  def verify_account!
    @options[:relayed_through_account] = @account
    @account = ActivityPub::LinkedDataSignature.new(@json).verify_account!
  rescue JSON::LD::JsonLdError => e
    Rails.logger.debug "Could not verify LD-Signature for #{value_or_id(@json['actor'])}: #{e.message}"
    nil
  end
end
