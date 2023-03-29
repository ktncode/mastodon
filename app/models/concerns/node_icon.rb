# frozen_string_literal: true

module NodeIcon
  extend ActiveSupport::Concern

  IMAGE_MIME_TYPES = %w(image/jpeg image/png image/gif image/webp image/vnd.microsoft.icon).freeze
  IMAGE_CONVERTIBLE_MIME_TYPES = %w(image/vnd.microsoft.icon).freeze
  LIMIT = 2.megabytes

  class_methods do
    def icon_styles(file)
      styles = { original: { geometry: '400x400#', convert_options: '+profile exif', file_geometry_parser: FastGeometryParser, processors: ->(f) { file_processors f } } }
      styles[:static] = { geometry: '400x400#', format: 'png', convert_options: '-coalesce +profile exif', file_geometry_parser: FastGeometryParser } if file.content_type == 'image/gif'
      styles
    end

    def file_processors(instance)
      if IMAGE_CONVERTIBLE_MIME_TYPES.include?(instance.icon_content_type)
        [:webp_converter]
      else
        [:noop]
      end
    end

    private :icon_styles
  end

  included do
    # Icon upload
    has_attached_file :icon, styles: ->(f) { icon_styles(f) }
    validates_attachment_content_type :icon, content_type: IMAGE_MIME_TYPES, presence: true
    validates_attachment_size :icon, less_than: LIMIT
    remotable_attachment :icon, LIMIT, suppress_errors: true
  end

  def icon_original_url
    icon.url(:original)
  end

  def icon_static_url
    icon_content_type == 'image/gif' ? icon.url(:static) : icon_original_url
  end
end
