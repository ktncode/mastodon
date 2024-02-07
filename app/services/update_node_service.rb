# frozen_string_literal: true

class UpdateNodeService < BaseService
  include JsonLdHelper

  NODEINFO_2_1_REL = 'http://nodeinfo.diaspora.software/ns/schema/2.1'
  NODEINFO_2_0_REL = 'http://nodeinfo.diaspora.software/ns/schema/2.0'

  attr_reader :node
  
  def call(domain, **options)
    @domain   = Addressable::URI.parse(domain).normalize.to_s
    @options  = { fetch: true, process: false }.merge(options)
    @node     = Node.find_or_create_by!(domain: @domain)

    last_fetched_at = node.last_fetched_at

    fetch_all     if @options[:fetch]
    proccess_info if @options[:process] || last_fetched_at != node.last_fetched_at
  end

  private

  def nodeinfo(*args)
    node&.nodeinfo&.dig(*args)
  rescue
    nil
  end

  def instance(*args)
    node&.instance_data&.dig(*args)
  rescue
    nil
  end

  def info(*args)
    node&.info&.dig(*args)
  rescue
    nil
  end

  def fetch_all
    return unless @options[:force] || node.node? && node.possibly_stale? && node.available?

    fetch_nodeinfo

    return unless node.available?

    if node.mastodon_api_compatible?
      fetch_mastodon_instance_data
    elsif node.misskey_api_compatible?
      fetch_misskey_instance_data
    end
  end

  def proccess_info
    preprocess_info
    process_features
    process_icon
    process_thumbnail
    process_software_specific_override
    process_override

    node.save!
  end

  def process_software
    software    = nodeinfo('software', 'name')&.downcase || ''
    version     = nodeinfo('software', 'version') || ''
    core, build = version.split('+')
    core        = core&.strip || ''
    build       = build&.strip || ''

    if build.blank?
      {
        'upstream_name'    => nodeinfo('metadata', 'upstream', 'name')&.downcase || Node.upstream(software) || software,
        'upstream_version' => nodeinfo('metadata', 'upstream', 'version') || core,
        'software_name'    => software,
        'software_version' => core,
      }
    elsif /^[\d\.]$/i.match?(build)
      {
        'upstream_name'    => Node.upstream(software) || software,
        'upstream_version' => build,
        'software_name'    => software,
        'software_version' => core,
      }
    else
      {
        'upstream_name'    => Node.upstream(software) || software,
        'upstream_version' => core,
        'software_name'    => software,
        'software_version' => version,
      }
    end
  end

  def preprocess_info
    node.info ||= {}
  end

  def process_features
    node.info.merge!({
      'emoji_reaction_type' => (
        if nodeinfo('metadata', 'features')&.include?('custom_emoji_reactions') || instance('fedibird_capabilities')&.include?('emoji_reaction') || info('upstream_name') == 'misskey'
          'custom'
        elsif nodeinfo('metadata', 'features')&.include?('pleroma_emoji_reactions')
          'unicode'
        else
          'none'
        end
      ),
      'quote'             => nodeinfo('metadata', 'features')&.include?('quote_posting') || instance('feature_quote') || node.info.dig('upstream_name') == 'misskey',
      'favourite'         => info('upstream_name') != 'misskey',
      'description'       => Formatter.instance.reformat(instance('short_description').presence || instance('description').presence || nodeinfo('metadata', 'nodeDescription').presence || ''),
      'languages'         => info('languages').presence || instance('languages').presence || instance('langs').presence || [],
      'registrations'     => nodeinfo('openRegistrations') || (instance('registrations').is_a?(Hash) ? instance('registrations', 'enabled') : instance('registrations')) || instance('features', 'registration'),
      'approval_required' => instance('registrations').is_a?(Hash) ? instance('registrations', 'approval_required') : nil,
      'total_users'       => nodeinfo('usage', 'users', 'total') || instance('stats', 'user_count') || Instance.find(@domain)&.accounts_count,
      'last_week_users'   => nodeinfo('usage', 'users', 'activeMonth') || instance('usage', 'users', 'active_month') || instance('pleroma', 'stats', 'mau'),
      'last_week_active_users_in_cache' => last_week_users_local,
      'name'              => nodeinfo('metadata', 'nodeName').presence || instance('name').presence || instance('title').presence || instance('name').presence,
      'url'               => full_uri(instance('domain').presence || instance('uri').presence || @domain),
      'theme_color'       => nodeinfo('metadata', 'themeColor').presence || instance('themeColor').presence,
    })
  end

  def last_week_users_local
    Account.joins(:account_stat).where(domain: @domain == Rails.configuration.x.local_domain ? nil : @domain).group(:domain).order(total_active_posters: :desc).without_suspended.without_silenced.without_instance_actor.without_bots.where(account_stat: {last_status_at: 1.week.ago..}).select('domain, count(*) total_active_posters').take&.total_active_posters
  end

  def full_uri(domain)
    domain = "https://#{domain}" unless domain.start_with?(%r(http[s]?://))
    Addressable::URI.parse(domain).normalize.to_s
  end

  def process_software_specific_override
    node.info.merge!(
      if info('upstream_name') == 'birdsitelive'
        {
          'resolve_account'     => false,
          'quote'               => false,
          'emoji_reaction_type' => 'none',
          'emoji_reaction_max'  => 0,
          'reference'           => 'none',
          'favourite'           => 'none',
          'reply'               => 'none',
          'reblog'              => 'none',
        }
      else
        {}
      end
    )
  end

  def process_thumbnail
    remote_url = instance('thumbnail') || instance('bannerUrl')
    remote_url = remote_url&.dig('url') if remote_url.is_a?(Hash)

    node.thumbnail_remote_url = nil if @options[:force]
    node.thumbnail_remote_url = remote_url
    raise Mastodon::ValidationError if node.errors[:thumbnail].present?
  rescue Mastodon::UnexpectedResponseError, Mastodon::ValidationError, HTTP::TimeoutError, HTTP::ConnectionError, OpenSSL::SSL::SSLError, HTTP::Redirector::TooManyRedirectsError
    node.thumbnail = nil
  end

  def process_icon
    remote_url = instance('iconUrl') || fetch_icon_url

    node.icon_remote_url = nil if @options[:force]
    node.icon_remote_url = remote_url
    raise Mastodon::ValidationError if node.errors[:icon].present?
  rescue Mastodon::UnexpectedResponseError, Mastodon::ValidationError, Mastodon::LengthValidationError, HTTP::TimeoutError, HTTP::ConnectionError, OpenSSL::SSL::SSLError, HTTP::Redirector::TooManyRedirectsError
    node.icon = nil
  end

  def process_override
    node.info.merge!(node.info_override || {})
  end

  def fetch_icon_url
    doc = Nokogiri::HTML(html_fetch(info('url')))
    uri = Addressable::URI.parse(
            doc.css("meta[itemprop*=image]")&.first&.attributes&.fetch('content', nil)&.value ||
            doc.css("link[rel*=apple-touch-icon]")&.first&.attributes&.fetch('href', nil)&.value ||
            doc.css("link[rel*=icon]")&.first&.attributes&.fetch('href', nil)&.value
          )

    return if uri.nil?

    base = Addressable::URI.parse(doc.css("base")&.first&.attributes&.fetch('href', nil)&.value)

    if base.present?
      uri.path   = "#{base.path}#{uri.path}" unless uri.path.start_with?('/')
      uri.host   = base.host                 unless uri.host
      uri.scheme = base.scheme               unless uri.scheme
    end

    uri.path   = "/#{uri.path}" unless uri.path.start_with?('/')
    uri.host   = @domain        unless uri.host
    uri.scheme = 'https'        unless uri.scheme

    uri.normalize.to_s
  end

  def html_fetch(url, raise_error = false)
    Request.new(:get, url).perform do |response|
      raise Mastodon::UnexpectedResponseError, response unless response_successful?(response) || !raise_error

      response.body_with_limit(3.megabyte) if response.code == 200
    end
  end

  def fetch_nodeinfo
    Resolv::DNS.open.getaddress(@domain)
 
    well_known_nodeinfo = json_fetch("https://#{@domain}/.well-known/nodeinfo", true)

    if well_known_nodeinfo.present?
      nodeinfo_url   = well_known_nodeinfo['links'].find { |link| link&.fetch('rel', nil) == NODEINFO_2_1_REL }&.fetch('href', nil)
      nodeinfo_url ||= well_known_nodeinfo['links'].find { |link| link&.fetch('rel', nil) == NODEINFO_2_0_REL }&.fetch('href', nil)
    end

    node.nodeinfo        = nodeinfo_url.present? ? json_fetch(nodeinfo_url, true) : Node::ERROR_MISSING
    node.info            = process_software
    node.status          = :up
    node.last_fetched_at = Time.now.utc
    node.save!
  rescue Mastodon::UnexpectedResponseError => e
    case e.response.code
    when 401
      node.update!(status: :reject)
    when 404
      node.update!(status: :not_found)
    when 410
      node.update!(status: :gone)
    when 408, 429
      node.update!(status: :busy)
    when 400...500
      node.update!(status: :error)
      raise
    else
      node.update!(status: :error)
    end
  rescue Resolv::ResolvError
    node.update!(status: :no_address)
    raise
  rescue OpenSSL::SSL::SSLError
    node.update!(status: :error)
    raise
  rescue HTTP::TimeoutError, HTTP::ConnectionError
    node.update!(status: :busy)
    raise
  end

  def fetch_mastodon_instance_data
    instance_v2 = "https://#{@domain}/api/v2/instance"
    instance_v1 = "https://#{@domain}/api/v1/instance"

    major, minor, patch = node.upstream_version&.split('.')&.map(&:to_i)

    json = json_fetch(instance_v2) if major.nil? || major >= 4
    json = json_fetch(instance_v1) if json.nil? || json.dig('error').present?

    node.update!(instance_data: json) unless json.nil?
  end

  def fetch_misskey_instance_data
    json = misskey_api_call("https://#@domain}/api/meta", '{"detail":true}')

    node.update!(instance_data: json) unless json.nil?
  end
end
