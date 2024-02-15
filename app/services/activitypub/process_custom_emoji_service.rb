# frozen_string_literal: true

class ActivityPub::ProcessCustomEmojiService < BaseService
  include JsonLdHelper
  include DomainControlHelper
  include Redisable

  # Should be called with confirmed valid JSON
  def call(shortcode, domain, json, options = {})
    return if unsupported_uri_scheme?(json['id']) || domain_not_allowed?(domain)

    @options     = options
    @json        = json
    @uri         = @json['id']
    @shortcode   = shortcode
    @domain      = domain

    RedisLock.acquire(lock_options) do |lock|
      if lock.acquired?
        update_node if !Node.domain(@domain).exists?
        process_emoji
      else
        raise Mastodon::RaceConditionError
      end
    end
  end

  private

  def skip_download?
    domain_block&.reject_media?
  end

  def domain_block
    return @domain_block if defined?(@domain_block)
    @domain_block = DomainBlock.rule_for(@domain)
  end

  def update_node
    UpdateNodeService.new.call(@domain)
  end

  def lock_options
    { redis: redis, key: "process_custom_emoji:#{@uri}", autorelease: 15.minutes.seconds }
  end

  def process_emoji
    return if skip_download?
    return if @json['name'].blank? || @json['icon'].blank? || @json['icon']['url'].blank?

    emoji = CustomEmoji.find_or_initialize_by(shortcode: @shortcode, domain: @domain) { |emoji| emoji.uri = @uri }

    emoji.org_category     = @json['category']
    emoji.copy_permission  = case @json['copyPermission'] when 'allow', true, '1' then 'allow' when 'deny', false, '0' then 'deny' when 'conditional' then 'conditional' else 'none' end
    emoji.license          = @json['license']
    emoji.aliases          = as_array(@json['keywords'])
    emoji.usage_info       = @json['usageInfo']
    emoji.author           = @json['author']
    emoji.description      = @json['description']
    emoji.is_based_on      = @json['isBasedOn']
    emoji.sensitive        = @json['sensitive']
    emoji.image_remote_url = @json['icon']['url']
    emoji.updated_at       = @json['updated'] if @json['updated']
    emoji.save

    emoji
  end
end
