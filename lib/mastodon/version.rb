# frozen_string_literal: true

module Mastodon
  module Version
    module_function

    def major
      3
    end

    def minor
      4
    end

    def patch
      1
    end

    def flags
      ''
    end

    def suffix
      '+ktn'
    end

    def to_a
      [major, minor, patch].compact
    end

    def to_s
      [to_a.join('.'), flags, suffix].join
    end

    def gem_version
      @gem_version ||= Gem::Version.new(to_s.split('+')[0])
    end

    def api_versions
      {
        mastodon: 1,
      }
    end

    def repository
      ENV.fetch('GITHUB_REPOSITORY', 'ktncode/mastodon')
    end

    def source_base_url
      ENV.fetch('SOURCE_BASE_URL', "https://github.com/#{repository}")
    end

    # specify git tag or commit hash here
    def source_tag
      ENV.fetch('SOURCE_TAG', nil)
    end

    def source_url
      if source_tag
        "#{source_base_url}/tree/#{source_tag}"
      else
        source_base_url
      end
    end

    def fedibird_verson
      '0.1+ktn'
    end

    def user_agent
      @user_agent ||= "#{HTTP::Request::USER_AGENT} (Mastodon/#{Version} Fedibird/#{fedibird_verson}; +http#{Rails.configuration.x.use_https ? 's' : ''}://#{Rails.configuration.x.web_domain}/)"
    end
  end
end
