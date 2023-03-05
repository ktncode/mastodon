# frozen_string_literal: true

class EmojiReactionValidator < ActiveModel::Validator
  SUPPORTED_EMOJIS = Oj.load(File.read(Rails.root.join('app', 'javascript', 'mastodon', 'features', 'emoji', 'emoji_map.json'))).keys.freeze
  LIMIT                 = 20
  MAX_PER_ACCOUNT       = 1
  MAX_PER_ACCOUNT_LIMIT = 20

  def validate(reaction)
    return if reaction.name.blank?

    @reaction = reaction

    max_per_account = [MAX_PER_ACCOUNT, Setting.reaction_max_per_account].max

    reaction.errors.add(:name, I18n.t('reactions.errors.unrecognized_emoji'))                        if reaction.custom_emoji_id.blank? && !unicode_emoji?(reaction.name)
    reaction.errors.add(:name, I18n.t('reactions.errors.limit_reached', max: max_per_account))       if  reaction.account.local? && reaction_per_account >= max_per_account
    reaction.errors.add(:name, I18n.t('reactions.errors.limit_reached', max: MAX_PER_ACCOUNT_LIMIT)) if !reaction.account.local? && reaction_per_account >= MAX_PER_ACCOUNT_LIMIT
  end

  private

  def unicode_emoji?(name)
    SUPPORTED_EMOJIS.include?(name)
  end

  def reaction_per_account
    EmojiReaction.where(account_id: @reaction.account_id, status_id: @reaction.status_id).size
  end
end
