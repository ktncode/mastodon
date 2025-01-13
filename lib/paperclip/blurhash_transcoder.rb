# frozen_string_literal: true

module Paperclip
  class BlurhashTranscoder < Paperclip::Processor
    def make
      return @file unless options[:style] == :tiny || options[:blurhash]

      width, height, data = blurhash_params
      # Guard against segfaults if data has unexpected size
      raise RangeError, "Invalid image data size (expected #{width * height * 3}, got #{data.size})" if data.size != width * height * 3 # TODO: should probably be another exception type

      attachment.instance.blurhash = Blurhash.encode(width, height, data, **(options[:blurhash] || {}))

      File.open(@file.path)
    end

    private

    def blurhash_params
      pixels   = convert(':source -layers \'flatten\' -depth 8 RGB:-', source: "#{File.expand_path(@file.path)}[0]").unpack('C*')
      geometry = options.fetch(:file_geometry_parser).from_file(@file)
      [geometry.width, geometry.height, pixels]
    end
  end
end
