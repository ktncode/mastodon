# frozen_string_literal: true

class CustomEmojiFilter
  KEYS = %i(
    local
    remote
    keywords
    copy_permission
    license
    category
    by_domain
    shortcode_match_type
    shortcode
    order
  ).freeze

  attr_reader :params

  def initialize(params)
    @params = params
  end

  def results
    scope = CustomEmoji.alphabetic

    params.each do |key, value|
      next if key.to_s == 'page'

      scope.merge!(scope_for(key, value)) if value.present?
    end

    scope
  end

  private

  def scope_for(key, value)
    case key.to_s
    when 'local'
      CustomEmoji.local.left_joins(:category).reorder(Arel.sql('custom_emoji_categories.name ASC NULLS FIRST, custom_emojis.shortcode ASC'))
    when 'remote'
      CustomEmoji.remote
    when 'keywords'
      if value == '1'
        CustomEmoji.where('array_length(custom_emojis.aliases, 1) IS NOT NULL')
      else
        CustomEmoji.where('array_length(custom_emojis.aliases, 1) IS NULL')
      end
    when 'copy_permission'
      CustomEmoji.where(copy_permission: value)
    when 'license'
      if value == '1'
        CustomEmoji.where("custom_emojis.meta?'license' AND custom_emojis.meta->>'license' != '' OR custom_emojis.meta?'usage_info' AND custom_emojis.meta->>'usage_info' != ''")
      else
        CustomEmoji.where("NOT (custom_emojis.meta?'license' AND custom_emojis.meta->>'license' != '' OR custom_emojis.meta?'usage_info' AND custom_emojis.meta->>'usage_info' != '')")
      end
    when 'category'
      if value == '*'
        CustomEmoji.where(category_id: nil)
      elsif (category_id = CustomEmojiCategory.where('"custom_emoji_categories"."name" ILIKE ?', "%#{value.strip}%").take&.id)
        CustomEmoji.where(category_id: category_id)
      else
        CustomEmoji.none
      end
    when 'by_domain'
      CustomEmoji.where(domain: value.strip.downcase)
    when 'shortcode_match_type'
      @shortcode_match_type = value.to_sym if Form::CustomEmojiBatch::SHORTCODE_MATCH_TYPES.include?(value)
      CustomEmoji.all
    when 'shortcode'
      CustomEmoji.search(value.strip, @shortcode_match_type)
    when 'order'
      if value == '0'
        CustomEmoji.reorder(updated_at: :desc)
      elsif value == '1'
        CustomEmoji.reorder(updated_at: :asc)
      end
    else
      raise "Unknown filter: #{key}"
    end
  end
end
