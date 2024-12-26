# frozen_string_literal: true

class PostProcessEmojiReactionCacheWorker
  include Sidekiq::Worker

  sidekiq_options queue: 'pull', retry: 1, dead: false

  def perform(custom_emoji_ids)
    Status.where(id: EmojiReaction.where(custom_emoji_id: custom_emoji_ids).pluck(:status_id).uniq).each(&:refresh_grouped_emoji_reactions!)
  end
end
