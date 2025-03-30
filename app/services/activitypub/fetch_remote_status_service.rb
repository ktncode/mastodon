# frozen_string_literal: true

class ActivityPub::FetchRemoteStatusService < BaseService
  include JsonLdHelper

  MAX_FETCH_DEPTH = 7

  # Should be called when uri has already been checked for locality
  def call(uri, **options)
    @options = { prefetched_body: nil, on_behalf_of: nil, depth: 1 }.merge(**options)

    return if @options[:depth] > MAX_FETCH_DEPTH
    @options[:depth] += 1

    @json = begin
      if @options[:prefetched_body].nil?
        fetch_resource(uri, true, @options[:on_behalf_of])
      else
        body_to_json(@options[:prefetched_body], compare_id: uri)
      end
    end

    return if !(supported_context? && expected_type?) || actor_id.nil? || !trustworthy_attribution?(@json['id'], actor_id)

    actor = ActivityPub::TagManager.instance.uri_to_resource(actor_id, Account)
    actor = ActivityPub::FetchRemoteAccountService.new.call(actor_id) if actor.nil? || needs_update?(actor)

    return if actor.nil? || actor.suspended?

    ActivityPub::Activity.factory(activity_json, actor, **@options.merge({ delivery: false })).perform
  end

  private

  def activity_json
    { 'type' => 'Create', 'actor' => actor_id, 'object' => @json }
  end

  def actor_id
    value_or_id(first_of_value(@json['attributedTo']))
  end

  def trustworthy_attribution?(uri, attributed_to)
    return false if uri.nil? || attributed_to.nil?
    Addressable::URI.parse(uri).normalized_host.casecmp(Addressable::URI.parse(attributed_to).normalized_host).zero?
  end

  def supported_context?
    super(@json)
  end

  def expected_type?
    equals_or_includes_any?(@json['type'], ActivityPub::Activity::Create::SUPPORTED_TYPES + ActivityPub::Activity::Create::CONVERTED_TYPES)
  end

  def needs_update?(actor)
    actor.possibly_stale?
  end
end
