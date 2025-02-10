# frozen_string_literal: true

class MoveMetaDataCustomEmojis < ActiveRecord::Migration[5.2]
  disable_ddl_transaction!

  MOVED_KEYS = %w(alternate_name ruby license usage_info creator description copyright_notice credit_text is_based_on sensitive related_links)

  def up
    emojis = CustomEmoji.where("meta->>'sensitive' = 'true'")
         .or(CustomEmoji.where("meta->>'alternate_name' != ''"))
         .or(CustomEmoji.where("meta->>'ruby' != ''"))
         .or(CustomEmoji.where("meta->>'license' != ''"))
         .or(CustomEmoji.where("meta->>'usage_info' != ''"))
         .or(CustomEmoji.where("meta->>'creator' != ''"))
         .or(CustomEmoji.where("meta->>'description' != ''"))
         .or(CustomEmoji.where("meta->>'copyright_notice' != ''"))
         .or(CustomEmoji.where("meta->>'credit_text' != ''"))
         .or(CustomEmoji.where("meta->>'is_based_on' != ''"))
         .or(CustomEmoji.where("jsonb_typeof(meta->'related_link') = 'array' and jsonb_array_length(meta->'related_link') > 0"))

    emojis.find_each do |emoji|
      MOVED_KEYS.each do |key|
        meta_key = key == 'related_links' ? 'related_link' : key
        val = emoji.meta.delete(meta_key)
        emoji.public_send("#{key}=", val) if val.present?
      end
      emoji.record_timestamps = false
      emoji.save!
    end
  end

  def down
    emojis = CustomEmoji.where(sensitive: true)
         .or(CustomEmoji.where.not(alternate_name: ''))
         .or(CustomEmoji.where.not(ruby: ''))
         .or(CustomEmoji.where.not(license: ''))
         .or(CustomEmoji.where.not(usage_info: ''))
         .or(CustomEmoji.where.not(creator: ''))
         .or(CustomEmoji.where.not(description: ''))
         .or(CustomEmoji.where.not(copyright_notice: ''))
         .or(CustomEmoji.where.not(credit_text: ''))
         .or(CustomEmoji.where.not(is_based_on: ''))
         .or(CustomEmoji.where('cardinality(related_links) > 0'))

    default = CustomEmoji.new
    emojis.find_each do |emoji|
      MOVED_KEYS.each do |key|
        val = emoji.public_send("#{key}")
        emoji.public_send("#{key}=", default.public_send("#{key}"))
        key = 'related_link' if key == 'related_links'
        emoji.meta[key] = val if val.present?
      end
      emoji.record_timestamps = false
      emoji.save!
    end
  end
end
