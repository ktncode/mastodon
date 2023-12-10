# frozen_string_literal: true

class RedirectLinkResolveWorker
  include Sidekiq::Worker
  include ExponentialBackoff

  sidekiq_options queue: 'pull', retry: 3

  def perform(url, status_id)
    parsed_url = Addressable::URI.parse(url)
    return if parsed_url.blank? || !%w(http https).include?(parsed_url.scheme) || parsed_url.host.blank? || RedirectLink.where(url: url).present?

    Request.new(:head, url).add_headers('User-Agent' => Mastodon::Version.user_agent + ' Bot').perform do |res|
      if res.code == 200 && url != res.uri.to_s
        RedirectLink.create(url: url, redirected_url: res.uri.to_s)
        Rails.cache.delete("statuses/#{status_id}")
      end
    end
  rescue HTTP::Error, OpenSSL::SSL::SSLError, Addressable::URI::InvalidURIError, Mastodon::HostValidationError
    true
  end
end
