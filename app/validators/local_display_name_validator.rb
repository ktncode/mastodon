# frozen_string_literal: true

class LocalDisplayNameValidator < ActiveModel::Validator
  MAX_CHARS = 30
  CUSTOM_EMOJI_PLACEHOLDER_CHARS = 1
  CUSTOM_EMOJI_PLACEHOLDER = 'x'

  def validate(account)
    return if account.display_name.blank?

    normalized_display_name = account.display_name.gsub(CustomEmoji::SCAN_RE, CUSTOM_EMOJI_PLACEHOLDER)

    account.errors.add(:display_name, :too_long, count: MAX_CHARS) if too_long?(normalized_display_name)
  end

  private

  def too_long?(normalized_display_name)
    countable_length(normalized_display_name) > MAX_CHARS
  end

  def countable_length(str)
    str.mb_chars.grapheme_length
  end
end
