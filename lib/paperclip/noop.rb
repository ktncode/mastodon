# frozen_string_literal: true

module Paperclip
  class Noop < Paperclip::Processor
    def make
      File.open(@file.path)
    end
  end
end
