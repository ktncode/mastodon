# frozen_string_literal: true

# == Schema Information
#
# Table name: nodes
#
#  id                     :bigint(8)        not null, primary key
#  domain                 :string           not null
#  info                   :jsonb
#  info_override          :jsonb
#  nodeinfo               :jsonb
#  instance_data          :jsonb
#  thumbnail_file_name    :string
#  thumbnail_content_type :string
#  thumbnail_file_size    :bigint(8)
#  thumbnail_updated_at   :datetime
#  thumbnail_remote_url   :string
#  blurhash               :string
#  last_fetched_at        :datetime
#  status                 :integer          default("up"), not null
#  note                   :string           default(""), not null
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#
class Node < ApplicationRecord
  include DomainControlHelper
  include NodeThumbnail

  enum status: { up: 0, gone: 1, reject: 2, busy: 3, not_found: 4, error: 5, no_address: 6 }, _suffix: :status

  has_many :accounts, primary_key: :domain, foreign_key: :domain, inverse_of: :node

  scope :domain, ->(domain) { where(domain: domain.downcase) if domain.present? }
  scope :software, ->(name) { where("nodeinfo->'software'->>'name' = ?", name.downcase) if name.present? }

  ERROR_MISSING = { 'error': 'missing' }

  MASTODON_API_COMPATIBLE = %w(
    mastodon
    pleroma
    pixelfed
    gotosocial
  )

  MISSKEY_API_COMPATIBLE = %w(
    misskey
    dolphin
  )

  FORKS = {
    'mastodon' => %w(
      hometown
      fedibird
      koyuspace
      ecko
    ),
    'misskey' => %w(
      meisskey
      areionskey
      calckey
      foundkey
      groundpolis
      groundpolis-milkey
    ),
    'pleroma' => %w(
      akkoma
    ),
  }

  COMPATIBLES = FORKS.keys.each_with_object({}) { |upstream, h| h.merge!(FORKS[upstream].each_with_object({}) { |fork, h| h[fork]=upstream }) }

  FEATURES = {
    resolve_account: true,
    emoji_reaction_type: 'custom',
    emoji_reaction_max: [EmojiReactionValidator::MAX_PER_ACCOUNT, Setting.reaction_max_per_account].max,
    reference: true,
    favourite: true,
    reply: true,
    reblog: true,
  }

  {
    software_name: '',
    software_version: '',
    upstream_name: '',
    upstream_version: '',
    description: '',
    languages: [],
    region: '',
    categories: [],
    proxied_thumbnail: '',
    total_users: 0,
    last_week_users: 0,
    registrations: false,
    approval_required: nil,
  }.each do |key, default|
    define_method(key) do
      self[:info]&.dig(key.to_s) || default
    end
  end

  alias software software_name
  alias version software_version
  alias upstream upstream_name

  def node?
    !missing?
  end

  def missing?
    nodeinfo&.dig('error') == 'missing'
  end

  def available?
    up_status? && !domain_not_allowed?(domain) && DeliveryFailureTracker.available?(domain)
  end

  def possibly_stale?
    last_fetched_at.nil? || last_fetched_at <= 1.day.ago
  end

  def mastodon_api_compatible?
    MASTODON_API_COMPATIBLE.include?(upstream_name&.downcase)
  end

  def misskey_api_compatible?
    MISSKEY_API_COMPATIBLE.include?(upstream_name&.downcase)
  end

  def features(feature)
    return unless FEATURES.keys.include?(feature.to_sym)

    info&.dig(feature.to_s).then { |value| value.nil? ? FEATURES[feature.to_sym] : value }
  end

  class << self
    def find_domain(domain)
      self.find_by(domain: domain)
    end

    def resolve_domain(domain, **options)
      UpdateNodeService.new.call(domain, **options)
      find_domain(domain)
    rescue
      nil
    end

    def upstream(fork)
      COMPATIBLES[fork&.downcase]
    end
  
    def forks(upstream)
      FORKS[upstream&.downcase]
    end
  end
end
