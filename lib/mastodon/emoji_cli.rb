# frozen_string_literal: true

require 'rubygems/package'
require 'zip'
require_relative '../../config/boot'
require_relative '../../config/environment'
require_relative 'cli_helper'

module Mastodon
  class EmojiCLI < Thor
    include CLIHelper

    def self.exit_on_failure?
      true
    end

    option :prefix
    option :suffix
    option :overwrite, type: :boolean
    option :unlisted, type: :boolean
    option :category
    desc 'import PATH', 'Import emoji from a TAR GZIP archive at PATH'
    long_desc <<-LONG_DESC
      Imports custom emoji from a TAR GZIP archive specified by PATH.

      Existing emoji will be skipped unless the --overwrite option
      is provided, in which case they will be overwritten.

      You can specify a --category under which the emojis will be
      grouped together.

      With the --prefix option, a prefix can be added to all
      generated shortcodes. Likewise, the --suffix option controls
      the suffix of all shortcodes.

      With the --unlisted option, the processed emoji will not be
      visible in the emoji picker (but still usable via other means)
    LONG_DESC
    def import(path)
      imported = 0
      skipped  = 0
      failed   = 0
      category = options[:category] ? CustomEmojiCategory.find_or_create_by(name: options[:category]) : nil

      Gem::Package::TarReader.new(Zlib::GzipReader.open(path)) do |tar|
        meta = {}
        tar.each do |entry|
          filename = File.basename(entry.full_name)
          next unless entry.file? && filename == 'meta.json'

          meta = Oj.load(entry.read).to_h { |m| [m['shortcode'], m] }
          break
        end
        tar.rewind

        tar.each do |entry|
          next unless entry.file? && CustomEmoji::IMAGE_FILE_EXTENSIONS.include?(File.extname(entry.full_name))

          filename = File.basename(entry.full_name, '.*')

          key = meta.key?(filename) ? filename : meta.find { |k, v| v['filename'] === entry.full_name }&.first;
          next if key.nil?

          # Skip macOS shadow files
          next if filename.start_with?('._')

          shortcode    = [options[:prefix], key, options[:suffix]].compact.join
          custom_emoji = CustomEmoji.local.find_by("LOWER(shortcode) = ?", shortcode.downcase)

          if custom_emoji && !options[:overwrite]
            skipped += 1
            next
          end

          custom_emoji                 ||= CustomEmoji.new(shortcode: shortcode, domain: nil)
          custom_emoji.image             = StringIO.new(entry.read)
          custom_emoji.image_file_name   = File.basename(entry.full_name)
          custom_emoji.visible_in_picker = !options[:unlisted]

          tag = meta[key]&.transform_keys!(CustomEmoji::ALIAS_KEYS)

          if tag.present?
            custom_emoji.copy_permission  = case tag['copy_permission'] when 'allow', true, '1' then 'allow' when 'deny', false, '0' then 'deny' when 'conditional' then 'conditional' else 'none' end
            custom_emoji.license          = tag['license']
            custom_emoji.misskey_license  = tag['misskey_license']
            custom_emoji.keywords         = tag['keywords']
            custom_emoji.related_links    = tag['related_links']
            custom_emoji.copyright_notice = tag['copyrightNotice']
            custom_emoji.credit_text      = tag['creditText']
            custom_emoji.usage_info       = tag['usage_info']
            custom_emoji.creator          = tag['creator'] || tag['author']
            custom_emoji.description      = tag['description']
            custom_emoji.is_based_on      = tag['is_based_on'] || ActivityPub::TagManager.instance.local_uri?(tag['uri']) ? '' : tag['uri']
            custom_emoji.sensitive        = tag['sensitive']

            if category.nil?
              custom_emoji.category = CustomEmojiCategory.find_or_create_by(name: tag['category'])
            else
              custom_emoji.category     = category
              custom_emoji.org_category = tag['category']
            end
          else
            custom_emoji.category = category
          end

          if custom_emoji.save
            imported += 1
          else
            custom_emoji.reset_image!

            failed += 1
            say('Failure/Error: ', :red)
            say(entry.full_name)
            say('    ' + custom_emoji.errors[:image].join(', '), :red)
          end
        end
      end

      puts
      say("Imported #{imported}, skipped #{skipped}, failed to import #{failed}", color(imported, skipped, failed))
    end

    option :category
    option :overwrite, type: :boolean
    desc 'export PATH', 'Export emoji to a TAR GZIP archive at PATH'
    long_desc <<-LONG_DESC
      Exports custom emoji to 'export.tar.gz' at PATH.

      The --category option dumps only the specified category.
      If this option is not specified, all emoji will be exported.

      The --overwrite option will overwrite an existing archive.
    LONG_DESC
    def export(path)
      exported         = 0
      category         = CustomEmojiCategory.find_by(name: options[:category])
      export_file_name = File.join(path, 'export.tar.gz')

      if File.file?(export_file_name) && !options[:overwrite]
        say("Archive already exists! Use '--overwrite' to overwrite it!")
        exit 1
      end
      if category.nil? && options[:category]
        say("Unable to find category '#{options[:category]}'!")
        exit 1
      end

      File.open(export_file_name, 'wb') do |file|
        Zlib::GzipWriter.wrap(file) do |gzip|
          Gem::Package::TarWriter.new(gzip) do |tar|
            scope = !options[:category] || category.nil? ? CustomEmoji.local : category.emojis
            scope.find_each do |emoji|
              say("Adding '#{emoji.shortcode}'...")
              tar.add_file_simple(emoji.shortcode + File.extname(emoji.image_file_name), 0o644, emoji.image_file_size) do |io|
                io.write Paperclip.io_adapters.for(emoji.image).read
                exported += 1
              end
            end
            say("Adding 'meta.json'...")
            json = Oj.dump(ActiveModelSerializers::SerializableResource.new(scope, each_serializer: Export::CustomEmojiSerializer))
            tar.add_file_simple('meta.json', 0o644, json.bytesize) do |io|
              io.write json
            end
          end
        end
      end
      say("Exported #{exported}")
    end

    option :category
    option :overwrite, type: :boolean
    desc 'misskey-export PATH', 'Misskey export emoji to a ZIP archive at PATH'
    long_desc <<-LONG_DESC
      Exports custom emoji to 'export.zip' at PATH.

      The --category option dumps only the specified category.
      If this option is not specified, all emoji will be exported.

      The --overwrite option will overwrite an existing archive.
    LONG_DESC
    def misskey_export(path)
      exported         = 0
      category         = CustomEmojiCategory.find_by(name: options[:category])
      export_file_name = File.join(path, 'export.zip')

      if File.file?(export_file_name) && !options[:overwrite]
        say("Archive already exists! Use '--overwrite' to overwrite it!")
        exit 1
      end
      if category.nil? && options[:category]
        say("Unable to find category '#{options[:category]}'!")
        exit 1
      end

      Zip::OutputStream.open(export_file_name) do |zos|
        scope = !options[:category] || category.nil? ? CustomEmoji.local : category.emojis
        scope.find_each do |emoji|
          say("Adding '#{emoji.shortcode}'...")
          zos.put_next_entry(emoji.shortcode + File.extname(emoji.image_file_name))
          zos.write Paperclip.io_adapters.for(emoji.image).read
          exported += 1
        end
        say("Adding 'meta.json'...")
        zos.put_next_entry('meta.json')
        zos.write Oj.dump(Misskey::MetaSerializer.new(scope))
      end
      say("Exported #{exported}")
    end

    option :remote_only, type: :boolean
    desc 'purge', 'Remove all custom emoji'
    long_desc <<-LONG_DESC
      Removes all custom emoji.

      With the --remote-only option, only remote emoji will be deleted.
    LONG_DESC
    def purge
      scope = options[:remote_only] ? CustomEmoji.remote : CustomEmoji
      scope.in_batches.destroy_all
      say('OK', :green)
    end

    option :local_only, type: :boolean
    option :remote_only, type: :boolean
    option :all, type: :boolean
    option :concurrency, type: :numeric, default: 5, aliases: [:c]
    option :verbose, type: :boolean, aliases: [:v]
    desc 'fix-dimension', 'Fix dimension all custom emoji'
    long_desc <<-LONG_DESC
      Fix dimension all custom emoji.

      With the --local-only option, only local emoji will be fixed.
      With the --remote-only option, only remote emoji will be fixed.
      With the --all option, fix dimension of all emojis.
    LONG_DESC
    def fix_dimension
      scope = CustomEmoji
      scope = scope.local if options[:local_only]
      scope = scope.remote if options[:remote_only]
      scope = scope.where(width: nil) unless options[:all]

      processed, fixed = parallelize_with_progress(scope) do |emoji|
        width, height = FastImage.size(emoji.image.url)
        next if width.nil?

        emoji.update!(width: width, height: height)
        1
      rescue
        next
      end

      say("Checked #{processed} emojis, fixed #{fixed}", :green, true)
    end

    private

    def color(green, _yellow, red)
      if !green.zero? && red.zero?
        :green
      elsif red.zero?
        :yellow
      else
        :red
      end
    end
  end
end
