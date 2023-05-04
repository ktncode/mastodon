# frozen_string_literal: true
# == Schema Information
#
# Table name: custom_emojis
#
#  id                           :bigint(8)        not null, primary key
#  shortcode                    :string           default(""), not null
#  domain                       :string
#  image_file_name              :string
#  image_content_type           :string
#  image_file_size              :integer
#  image_updated_at             :datetime
#  created_at                   :datetime         not null
#  updated_at                   :datetime         not null
#  disabled                     :boolean          default(FALSE), not null
#  uri                          :string
#  image_remote_url             :string
#  visible_in_picker            :boolean          default(TRUE), not null
#  category_id                  :bigint(8)
#  image_storage_schema_version :integer
#  width                        :integer
#  height                       :integer
#  thumbhash                    :string
#

class CustomEmoji < ApplicationRecord
  include Attachmentable

  LOCAL_LIMIT = (ENV['MAX_EMOJI_SIZE'] || 256.kilobytes).to_i
  LIMIT       = [LOCAL_LIMIT, (ENV['MAX_REMOTE_EMOJI_SIZE'] || 256.kilobytes).to_i].max
  MAX_PIXELS  = 750_000 # 1500x500px

  SHORTCODE_RE_FRAGMENT = '[a-zA-Z0-9_]{2,}'

  SCAN_RE = /(?<=[^[:alnum:]:]|\n|^)
    :(#{SHORTCODE_RE_FRAGMENT}):
    (?=[^[:alnum:]:]|$)/x

  IMAGE_MIME_TYPES = %w(image/png image/gif image/webp image/jpeg image/heif image/heic image/avif image/bmp).freeze
  IMAGE_CONVERTIBLE_MIME_TYPES = %w(image/jpeg image/heif image/heic image/bmp).freeze

  GLOBAL_CONVERT_OPTIONS = {
    all: '+profile "!icc,*" +set modify-date +set create-date -define webp:use-sharp-yuv=1 -define webp:emulate-jpeg-size=true -quality 90',
  }.freeze

  belongs_to :category, class_name: 'CustomEmojiCategory', optional: true
  has_one :local_counterpart, -> { where(domain: nil) }, class_name: 'CustomEmoji', primary_key: :shortcode, foreign_key: :shortcode

  has_attached_file :image, styles: ->(f) { file_styles(f) }, processors: [:lazy_thumbnail], convert_options: GLOBAL_CONVERT_OPTIONS

  before_validation :downcase_domain

  validates_attachment :image, content_type: { content_type: IMAGE_MIME_TYPES }, presence: true
  validates_attachment_size :image, less_than: LIMIT, unless: :local?
  validates_attachment_size :image, less_than: LOCAL_LIMIT, if: :local?
  validates :shortcode, uniqueness: { scope: :domain }, format: { with: /\A#{SHORTCODE_RE_FRAGMENT}\z/ }, length: { minimum: 2 }

  scope :local, -> { where(domain: nil) }
  scope :remote, -> { where.not(domain: nil) }
  scope :alphabetic, -> { order(domain: :asc, shortcode: :asc) }
  scope :by_domain_and_subdomains, ->(domain) { where(domain: domain).or(where(arel_table[:domain].matches('%.' + domain))) }
  scope :listed, -> { local.where(disabled: false).where(visible_in_picker: true) }

  remotable_attachment :image, LIMIT

  before_save :extract_dimensions
  after_commit :remove_entity_cache

  def local?
    domain.nil?
  end

  def object_type
    :emoji
  end

  def copy!
    copy = self.class.find_or_initialize_by(domain: nil, shortcode: shortcode)
    copy.image = image
    copy.tap(&:save!)
  end

  class << self
    def from_text(text, domain = nil)
      return [] if text.blank?

      shortcodes = text.scan(SCAN_RE).map(&:first).uniq

      return [] if shortcodes.empty?

      EntityCache.instance.emoji(shortcodes, domain)
    end

    def search(shortcode)
      where('"custom_emojis"."shortcode" ILIKE ?', "%#{shortcode}%")
    end

    private

    def file_styles(file)
      styles = {
        original: {
          pixels: MAX_PIXELS,
          file_geometry_parser: FastGeometryParser,
        },
    
        static: {
          format: 'webp',
          content_type: 'image/webp',
          animated: false,
          file_geometry_parser: FastGeometryParser,
        },
      }

      if IMAGE_CONVERTIBLE_MIME_TYPES.include?(file.content_type)
        styles[:original].merge!({
          format: 'webp',
          content_type: 'image/webp',
          animated: true,
        })
      end

      styles
    end
  end

  private

  def extract_dimensions
    file = image.queued_for_write[:original]

    return if file.nil?

    width, height = FastImage.size(file.path)

    return nil if width.nil?

    self.width  = width
    self.height = height
  end

  def remove_entity_cache
    Rails.cache.delete(EntityCache.instance.to_key(:emoji, shortcode, domain))
  end

  def downcase_domain
    self.domain = domain.downcase unless domain.nil?
  end
end
