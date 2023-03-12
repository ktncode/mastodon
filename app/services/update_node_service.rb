# frozen_string_literal: true

class UpdateNodeService < BaseService
  include JsonLdHelper

  NODEINFO_2_1_REL = 'http://nodeinfo.diaspora.software/ns/schema/2.1'
  NODEINFO_2_0_REL = 'http://nodeinfo.diaspora.software/ns/schema/2.0'

  attr_reader :domain, :options, :node
  
  def call(domain, **options)
    @domain   = domain
    @options  = options
    @node     = Node.find_or_create_by!(domain: domain)

    last_fetched_at = node.last_fetched_at

    fetch_all     if !options[:skip_fetch]
    proccess_info if options[:force] || last_fetched_at != node.last_fetched_at
  end

  private

  def nodeinfo(*args)
    node&.nodeinfo&.dig(*args)
  end

  def instance(*args)
    node&.instance_data&.dig(*args)
  end

  def info(*args)
    node&.info&.dig(*args)
  end

  def fetch_all
    return unless options[:force] || node.node? && node.possibly_stale? && node.available?

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
        'upstream_name'    => nodeinfo('metadata', 'upstream', 'name')&.downcase || Node::COMPATIBLES[software] || software,
        'upstream_version' => nodeinfo('metadata', 'upstream', 'version') || core,
        'software_name'    => software,
        'software_version' => core,
      }
    elsif /^[\d\.]$/i.match?(build)
      {
        'upstream_name'    => Node::COMPATIBLES[software] || software,
        'upstream_version' => build,
        'software_name'    => software,
        'software_version' => core,
      }
    else
      {
        'upstream_name'    =>  Node::COMPATIBLES[software] || software,
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
      'description'       => instance('short_description') || instance('description') || nodeinfo('nodeDescription') || '',
      'languages'         => info('languages') || instance('languages') || instance('langs') || [],
      'registrations'     => nodeinfo('openRegistrations') || (instance('registrations').is_a?(Hash) ? instance('registrations', 'enabled') : instance('registrations')) || instance('features', 'registration'),
      'approval_required' => instance('registrations').is_a?(Hash) ? instance('registrations', 'approval_required') : nil,
      'total_users'       => nodeinfo('usage', 'users', 'total') || instance('stats', 'user_count'),
      'last_week_users'   => nodeinfo('usage', 'users', 'activeMonth') || instance('usage', 'users', 'active_month') || instance('pleroma', 'stats', 'mau'),
    })
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

    node.thumbnail_remote_url = nil if options[:force]
    node.thumbnail_remote_url = remote_url
  end

  def process_override
    node.info.merge!(node.info_override || {})
  end

  def fetch_nodeinfo
    Resolv::DNS.open.getaddress(domain)
 
    well_known_nodeinfo = json_fetch("https://#{domain}/.well-known/nodeinfo", true)

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
    instance_v2 = "https://#{domain}/api/v2/instance"
    instance_v1 = "https://#{domain}/api/v1/instance"

    major, minor, patch = node.upstream_version&.split('.')&.map(&:to_i)

    json   = json_fetch(instance_v2) if major.nil? || major >= 4
    json ||= json_fetch(instance_v1)

    node.update!(instance_data: json) unless json.nil?
  end

  def fetch_misskey_instance_data
    json = misskey_api_call("https://#{domain}/api/meta", '{"detail":true}')

    node.update!(instance_data: json) unless json.nil?
  end

  def json_fetch(url, raise_error = false)
    build_get_request(url).perform do |response|
      raise Mastodon::UnexpectedResponseError, response unless response_successful?(response) || !raise_error

      body_to_json(response.body_with_limit) if response.code == 200
    end
  end

  def build_get_request(url)
    Request.new(:get, url).tap do |request|
      request.add_headers('Accept' => 'application/json')
    end
  end

  def misskey_api_call(url, json)
    build_post_request(url, json).perform do |response|
      raise Mastodon::UnexpectedResponseError, response unless response_successful?(response)

      body_to_json(response.body_with_limit) if response.code == 200
    end
  end

  def build_post_request(url, json)
    Request.new(:post, url, body: json).tap do |request|
      request.add_headers('Accept' => 'application/json')
      request.add_headers('Content-Type' => 'application/json')
    end
  end
end
