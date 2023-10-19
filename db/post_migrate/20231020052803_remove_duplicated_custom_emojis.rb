# frozen_string_literal: true

class RemoveDuplicatedCustomEmojis < ActiveRecord::Migration[5.2]
  def up
    dups  = CustomEmoji.where(domain: Rails.configuration.x.local_domain).map { |emoji| [CustomEmoji.where(domain: nil, shortcode: emoji.shortcode).pluck(:id).first, emoji.id] }
    
    dups.each do |id, invalid_id|
      if id.nil?
        EmojiReaction.find_by(custom_emoji_id: invalid_id)&.destroy
      else
        EmojiReaction.find_by(custom_emoji_id: invalid_id)&.update!(custom_emoji_id: id)
      end
      CustomEmoji.find_by(id: invalid_id)&.destroy
    end
  end

  def down
    # nothing to do
  end
end
