# frozen_string_literal: true

module Paperclip
  class ThumbhashTranscoder < Paperclip::Processor
    def make
      return @file unless %i(tiny static).include?(options[:style])

      pixels   = convert(':source -sample \'100x100>\' -depth 8 RGBA:-', source: "#{File.expand_path(@file.path)}[0]").unpack('C*')

      return @file if pixels.nil?

      geometry = options.fetch(:file_geometry_parser).from_file(@file)

      if geometry.width > 100 || geometry.height > 100
        if geometry.width < geometry.height
          geometry.height = 100
          geometry.width  = pixels.size / 400
        else
          geometry.width  = 100
          geometry.height = pixels.size / 400
        end
      end

      thumbhash = Base64.strict_encode64(ThumbHash.rgba_to_thumb_hash(geometry.width.to_i, geometry.height.to_i, pixels))

      if attachment.instance_respond_to?(:thumbhash)
        attachment.instance_write(:thumbhash, thumbhash)
      elsif attachment.instance.respond_to?(:thumbhash)
        attachment.instance.thumbhash = thumbhash
      end

      @file
    end
  end
end
