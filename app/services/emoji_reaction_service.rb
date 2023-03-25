# frozen_string_literal: true

class EmojiReactionService < BaseService
  include Authorization
  include Payloadable

  def call(account, status, emoji)
    @account          = account
    shortcode, domain = emoji.split("@")

    return if account.nil? || status.nil? || shortcode.nil?

    custom_emoji   = CustomEmoji.find_by(shortcode: shortcode, domain: domain)
    emoji_reaction = EmojiReaction.find_or_create_by!(account_id: account.id, status_id: status.id, name: shortcode, custom_emoji: custom_emoji)

    emoji_reaction.tap do |emoji_reaction|
      create_notification(emoji_reaction)
      bump_potential_friendship(account, status)
    end
  end

  private 

  def create_notification(emoji_reaction)
    status = emoji_reaction.status

    NotifyService.new.call(status.account, :emoji_reaction, emoji_reaction) if status.account.local?

    return if status.account.silenced?

    if status.account.local?
      ActivityPub::CustomEmojiDistributionWorker.perform_async(emoji_reaction.id, 'create')
    elsif status.account.activitypub?
      type = emoji_reaction.unicode? && status.account.node.features(:emoji_reaction_type) == 'unicode' ? 'EmojiReact' : 'Like'
      ActivityPub::DeliveryWorker.perform_async(build_json(emoji_reaction, type), emoji_reaction.account_id, status.account.inbox_url)
    end
  end

  def bump_potential_friendship(account, status)
    ActivityTracker.increment('activity:interactions')

    return if account.following?(status.account_id)

    PotentialFriendshipTracker.record(account.id, status.account_id, :emoji_reaction)
  end

  def build_json(emoji_reaction, type)
    Oj.dump(serialize_payload(emoji_reaction, ActivityPub::EmojiReactionSerializer, signer: @account, type: type))
  end
end
