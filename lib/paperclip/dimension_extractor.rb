# frozen_string_literal: true

module Paperclip
  class DimensionExtractor < Paperclip::Processor
    def make
      geometry = options.fetch(:file_geometry_parser).from_file(@file)

      attachment.instance.width  = geometry.width  if attachment.instance.respond_to?(:width)
      attachment.instance.height = geometry.height if attachment.instance.respond_to?(:height)

      File.open(@file.path)
    end
  end
end
