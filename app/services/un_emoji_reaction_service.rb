# frozen_string_literal: true

class UnEmojiReactionService < BaseService
  include Payloadable

  def call(account, status, emoji, **options)
    @account          = account
    shortcode, domain = emoji&.split("@")

    if shortcode
      if options[:shortcode_only]
        emoji_reactions = EmojiReaction.where(account: account, status: status, name: shortcode)
      else
        custom_emoji    = CustomEmoji.find_by(shortcode: shortcode, domain: domain)
        emoji_reactions = EmojiReaction.where(account: account, status: status, name: shortcode, custom_emoji: custom_emoji)
      end
    else
      emoji_reactions = EmojiReaction.where(account: account, status: status)
    end

    emoji_reactions.each do |emoji_reaction|
      emoji_reaction.destroy!
      create_notification(emoji_reaction)
    end
  end

  private

  def create_notification(emoji_reaction)
    status = emoji_reaction.status

    if status.account.local?
      ActivityPub::RawDistributionWorker.perform_async(build_json(emoji_reaction), status.account.id, [@account.preferred_inbox_url])
    elsif status.account.activitypub?
      ActivityPub::DeliveryWorker.perform_async(build_json(emoji_reaction), emoji_reaction.account_id, status.account.inbox_url)
    end
  end

  def build_json(emoji_reaction)
    Oj.dump(serialize_payload(emoji_reaction, ActivityPub::UndoEmojiReactionSerializer, signer: @account))
  end
end
