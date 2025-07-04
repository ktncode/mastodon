# frozen_string_literal: true

class FetchLinkCardService < BaseService
  include Redisable

  URL_PATTERN = %r{
    (#{Twitter::TwitterText::Regex[:valid_url_preceding_chars]})                                                                #   $1 preceeding chars
    (                                                                                                                           #   $2 URL
      (https?:\/\/)                                                                                                             #   $3 Protocol (required)
      (#{Twitter::TwitterText::Regex[:valid_domain]})                                                                           #   $4 Domain(s)
      (?::(#{Twitter::TwitterText::Regex[:valid_port_number]}))?                                                                #   $5 Port number (optional)
      (/#{Twitter::TwitterText::Regex[:valid_url_path]}*)?                                                                      #   $6 URL Path and anchor
      (\?#{Twitter::TwitterText::Regex[:valid_url_query_chars]}*#{Twitter::TwitterText::Regex[:valid_url_query_ending_chars]})? #   $7 Query String
    )
  }iox

  # URL size limit to safely store in PosgreSQL's unique indexes
  BYTESIZE_LIMIT = 2692

  IGNORE_REDIRECT_HOST = %w(
    link.parallelgame.com
    audon.space
  )

  PRESET_ENDPOINTS = {
    'www.youtube.com' => {:endpoint=>"https://www.youtube.com/oembed?format=json&url={url}", :format=>:json},
    'youtu.be'        => {:endpoint=>"https://www.youtube.com/oembed?format=json&url={url}", :format=>:json},
  }

  def need_fetch?(status)
    @status = status
    parse_urls.present?
  end

  def call(status, **options)
    @status      = status
    @parse_urls  = parse_urls
    @url         = @parse_urls.shift
    @parse_urls -= RedirectLink.where(url: @parse_urls).pluck(:url)

    RedirectLinkResolveWorker.push_bulk(@parse_urls) do |url|
      redis.sadd("statuses/#{@status.id}/processing", "RedirectLinkResolveWorker:#{url}")
      redis.expire("statuses/#{@status.id}/processing", 60.seconds)
      [url.to_s, @status.id]
    end

    return if @url.nil? || @status.preview_cards.any?

    RedisLock.acquire(lock_options.merge(options.slice(:retry))) do |lock|
      if lock.acquired?
        @card = PreviewCard.find_by(url: @url)
        process_url if @card.nil? || @card.updated_at <= 2.weeks.ago || @card.missing_image?
      else
        raise Mastodon::RaceConditionError unless options[:retry] == false
      end
    end

    attach_card if @card&.persisted?
  rescue HTTP::Error, OpenSSL::SSL::SSLError, Addressable::URI::InvalidURIError, Mastodon::HostValidationError, Mastodon::LengthValidationError => e
    Rails.logger.debug "Error fetching link #{@url}: #{e}"
    nil
  end

  private

  def process_url
    html
    @card ||= PreviewCard.new(url: @url, redirected_url: @redirected_url)

    attempt_oembed || attempt_opengraph
  end

  def html
    return @html if defined?(@html)

    Request.new(:get, @url).add_headers('Accept' => 'text/html', 'User-Agent' => Mastodon::Version.user_agent + ' Bot').perform do |res|
      if res.code == 200 && res.mime_type == 'text/html'
        @html_charset = res.charset
        @html = res.body_with_limit(4.megabyte)

        parsed_url = Addressable::URI.parse(@url)
        res_uri = Addressable::URI.parse(res.uri.to_s)
        if !IGNORE_REDIRECT_HOST.include?(parsed_url.host) && @url != res_uri.to_s && !(parsed_url.normalized_host.casecmp(res_uri.normalized_host)&.zero? && res_uri.path.match?(/^$|^\/[A-Za-z]{2,}([_\-][A-Za-z]{2,})?$/))
          @redirected_url = res_uri.to_s
          RedirectLink.create(url: @url, redirected_url: res_uri.to_s)
        end
      else
        @html_charset = nil
        @html = nil
      end
    end
  end

  def attach_card
    @status.preview_cards << @card
    StatusStat.find_by(status_id: @status.id)&.touch || StatusStat.create!(status_id: @status.id)
  end

  def parse_urls
    if @status.local?
      urls = @status.text.scan(URL_PATTERN).map { |array| Addressable::URI.parse(array[1]).normalize }
      urls.push(Addressable::URI.parse(references_short_account_status_url(@status.account, @status))) if @status.references.exists?
    else
      html  = Nokogiri::HTML(@status.text)
      links = html.css(':not(.quote-inline) > a')
      urls  = links.filter_map { |a| Addressable::URI.parse(a['href']) unless skip_link?(a) }.filter_map(&:normalize)
    end

    urls.uniq.reject { |uri| bad_url?(uri) }.map(&:to_s)
  end

  def bad_url?(uri)
    # Avoid local instance URLs and invalid URLs
    uri.host.blank? || (TagManager.instance.local_url?(uri.to_s) && !status_reference_url?(uri.to_s)) || !%w(http https).include?(uri.scheme) || uri.to_s.bytesize > BYTESIZE_LIMIT
  end

  def status_reference_url?(uri)
    recognized_params = Rails.application.routes.recognize_path(uri) rescue {}
    recognized_params && recognized_params[:controller] == 'statuses' && recognized_params[:action] == 'references'
  end

  # rubocop:disable Naming/MethodParameterName
  def mention_link?(a)
    @status.mentions.any? do |mention|
      a['href'] == ActivityPub::TagManager.instance.url_for(mention.account)
    end
  end

  def skip_link?(a)
    # Avoid links for hashtags and mentions (microformats)
    a['rel']&.include?('tag') || a['class']&.match?(/u-url|h-card/) || mention_link?(a)
  end
  # rubocop:enable Naming/MethodParameterName

  def attempt_oembed
    service         = FetchOEmbedService.new
    url_domain      = Addressable::URI.parse(@url).normalized_host
    cached_endpoint = Rails.cache.read("oembed_endpoint:#{url_domain}") || PRESET_ENDPOINTS[url_domain]

    embed   = service.call(@url, cached_endpoint: cached_endpoint) unless cached_endpoint.nil?
    embed ||= service.call(@url, html: html) unless html.nil?

    return false if embed.nil?

    url = Addressable::URI.parse(service.endpoint_url)

    @card.type          = embed[:type]
    @card.title         = embed[:title]         || ''
    @card.author_name   = embed[:author_name]   || ''
    @card.author_url    = embed[:author_url].present? ? (url + embed[:author_url]).to_s : ''
    @card.provider_name = embed[:provider_name] || ''
    @card.provider_url  = embed[:provider_url].present? ? (url + embed[:provider_url]).to_s : ''
    @card.width         = 0
    @card.height        = 0

    case @card.type
    when 'link'
      @card.image_remote_url = (url + embed[:thumbnail_url]).to_s if embed[:thumbnail_url].present?
    when 'photo'
      return false if embed[:url].blank?

      @card.embed_url        = (url + embed[:url]).to_s
      @card.image_remote_url = (url + embed[:url]).to_s
      @card.width            = embed[:width].presence  || 0
      @card.height           = embed[:height].presence || 0
    when 'video'
      @card.width            = embed[:width].presence  || 0
      @card.height           = embed[:height].presence || 0
      @card.html             = Formatter.instance.sanitize(embed[:html], Sanitize::Config::MASTODON_OEMBED)
      @card.image_remote_url = (url + embed[:thumbnail_url]).to_s if embed[:thumbnail_url].present?
    when 'rich'
      # Most providers rely on <script> tags, which is a no-no
      return false
    end

    @card.save_with_optional_image!
  end

  def attempt_opengraph
    return if html.nil?

    detector = CharlockHolmes::EncodingDetector.new
    detector.strip_tags = true

    guess      = detector.detect(@html, @html_charset)
    encoding   = guess&.fetch(:confidence, 0).to_i > 60 ? guess&.fetch(:encoding, nil) : nil
    page       = Nokogiri::HTML(@html, nil, encoding)
    player_url = meta_property(page, 'twitter:player')

    if player_url && !bad_url?(Addressable::URI.parse(player_url))
      @card.type   = :video
      @card.width  = meta_property(page, 'twitter:player:width') || 0
      @card.height = meta_property(page, 'twitter:player:height') || 0
      @card.html   = content_tag(:iframe, nil, src: player_url,
                                               width: @card.width,
                                               height: @card.height,
                                               allowtransparency: 'true',
                                               scrolling: 'no',
                                               frameborder: '0')
    else
      @card.type = :link
    end

    @card.title            = meta_property(page, 'og:title').presence || page.at_xpath('//title')&.content || ''
    @card.description      = meta_property(page, 'og:description').presence || meta_property(page, 'description') || ''
    @card.image_remote_url = (Addressable::URI.parse(@url) + meta_property(page, 'og:image')).to_s if meta_property(page, 'og:image')

    return if @card.title.blank? && @card.html.blank?

    @card.save_with_optional_image!
  end

  def meta_property(page, property)
    page.at_xpath("//meta[contains(concat(' ', normalize-space(@property), ' '), ' #{property} ')]")&.attribute('content')&.value || page.at_xpath("//meta[@name=\"#{property}\"]")&.attribute('content')&.value
  end

  def lock_options
    { redis: redis, key: "fetch:#{@url}", autorelease: 15.minutes.seconds }
  end
end
