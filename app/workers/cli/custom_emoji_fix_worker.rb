# frozen_string_literal: true

class Cli::CustomEmojiFixWorker
  include Sidekiq::Worker

  sidekiq_options queue: 'maintenance', backtrace: true, retry: false, dead: true, lock: :until_executed

  def perform(custom_emoji_id, options = {})
    emoji = CustomEmoji.find(custom_emoji_id)

    return true unless emoji.domain.nil? || DeliveryFailureTracker.available?(emoji.domain)

    if emoji.image.exists?
      emoji.image.reprocess!(:static)
    elsif emoji.image_remote_url.present? && emoji.domain.present? && DeliveryFailureTracker.available?(emoji.domain)
      emoji.reset_image!
    end

    emoji.save!

  rescue
    true
  end
end
