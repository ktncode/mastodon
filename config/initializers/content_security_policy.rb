# Define an application-wide content security policy
# For further information see the following documentation
# https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy

def host_to_url(str)
  return if str.blank?

  uri = Addressable::URI.parse("http#{Rails.configuration.x.use_https ? 's' : ''}://#{str}")
  uri.path += '/' unless uri.path.blank? || uri.path.end_with?('/')
  uri.to_s
end

base_host = Rails.configuration.x.web_domain

assets_host   = Rails.configuration.action_controller.asset_host
assets_host ||= host_to_url(base_host)

media_host   = host_to_url(ENV['S3_ALIAS_HOST'])
media_host ||= host_to_url(ENV['S3_CLOUDFRONT_HOST'])
media_host ||= host_to_url(ENV['S3_HOSTNAME']) if ENV['S3_ENABLED'] == 'true'
media_host ||= assets_host

instance_ticker_host = 'https://34.si'
github_host          = "https://raw.githubusercontent.com" # GitHub
google_fonts_host    = "https://fonts.gstatic.com" # Google Fonts

Rails.application.config.content_security_policy do |p|
  p.base_uri        :none
  p.default_src     :none
  p.frame_ancestors :none
  p.font_src        :self, assets_host, github_host, google_fonts_host
  p.img_src         :self, :https, :data, :blob, assets_host
  p.style_src       :self, assets_host, instance_ticker_host
  p.media_src       :self, :https, :data, assets_host
  p.frame_src       :self, :https
  p.manifest_src    :self, assets_host

  if Rails.env.development?
    webpacker_urls = %w(ws http).map { |protocol| "#{protocol}#{Webpacker.dev_server.https? ? 's' : ''}://#{Webpacker.dev_server.host_with_port}" }

    p.connect_src :self, :data, :blob, assets_host, media_host, Rails.configuration.x.streaming_api_base_url, *webpacker_urls
    p.script_src  :self, :unsafe_inline, :unsafe_eval, assets_host
    p.child_src   :self, :blob, assets_host
    p.worker_src  :self, :blob, assets_host
  else
    p.connect_src :self, :data, :blob, assets_host, media_host, Rails.configuration.x.streaming_api_base_url
    p.script_src  :self, assets_host
    p.child_src   :self, :blob, assets_host
    p.worker_src  :self, :blob, assets_host
  end
end

# Report CSP violations to a specified URI
# For further information see the following documentation:
# https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy-Report-Only
# Rails.application.config.content_security_policy_report_only = true

Rails.application.config.content_security_policy_nonce_generator = -> request { SecureRandom.base64(16) }

Rails.application.config.content_security_policy_nonce_directives = %w(style-src)

Rails.application.reloader.to_prepare do
  PgHero::HomeController.content_security_policy do |p|
    p.script_src :self, :unsafe_inline, assets_host
    p.style_src  :self, :unsafe_inline, assets_host
  end

  PgHero::HomeController.after_action do
    request.content_security_policy_nonce_generator = nil
  end
end
