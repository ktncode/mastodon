# frozen_string_literal: true

class ActivityPub::FetchRemoteCustomEmojiService < BaseService
  include JsonLdHelper

  # Should be called when uri has already been checked for locality
  def call(uri, id: true, prefetched_body: nil, on_behalf_of: nil)
    @json = begin
      if prefetched_body.nil?
        fetch_resource(uri, id, on_behalf_of)
      else
        body_to_json(prefetched_body, compare_id: id ? uri : nil)
      end
    end

    return if !(supported_context? && expected_type?)

    @shortcode = @json['name']&.delete(':')
    @domain    = Addressable::URI.parse(@json['id']).normalized_host
    @domain    = nil if @domain == Rails.configuration.x.local_domain

    return if @domain.nil?

    if Node.resolve_domain(@domain)&.misskey_api_compatible?
      begin
        misskey_api_call("https://#{@domain}/api/emoji", "{\"name\": \"#{@shortcode}\"}").tap do |misskey_emoji|
          break  if misskey_emoji.nil? 
          return if misskey_emoji['localOnly']

          @json['keywords']    ||= misskey_emoji['aliases']
          @json['category']    ||= misskey_emoji['category']
          @json['license']     ||= misskey_emoji['license']
          @json['isSensitive'] ||= misskey_emoji['isSensitive']
        end
      rescue
      end
    end

    ActivityPub::ProcessCustomEmojiService.new.call(@shortcode, @domain, @json)
  end

  private

  def supported_context?
    super(@json)
  end

  def expected_type?
    equals_or_includes_any?(@json['type'], ActivityPub::Activity::Create::SUPPORTED_TYPES + ActivityPub::Activity::Create::CONVERTED_TYPES + %w(Emoji))
  end

  def needs_update?(actor)
    actor.possibly_stale?
  end
end
