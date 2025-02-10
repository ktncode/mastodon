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
    by_description
    shortcode_match_type
    shortcode
    order
    status
    visibility
    sensitive
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
        CustomEmoji.where.not(license: '').or(CustomEmoji.where.not(usage_info: ''))
      else
        CustomEmoji.where(license: '', usage_info: '')
      end
    when 'status'
      if value == '1'
        CustomEmoji.where('custom_emojis.disabled = false')
      else
        CustomEmoji.where('custom_emojis.disabled = true')
      end
    when 'visibility'
      if value == '1'
        CustomEmoji.where('custom_emojis.visible_in_picker = true')
      else
        CustomEmoji.where('custom_emojis.visible_in_picker = false')
      end
    when 'sensitive'
      if value == '1'
        CustomEmoji.where(sensitive: true)
      else
        CustomEmoji.where(sensitive: false)
      end
    when 'category'
      if value == '*'
        CustomEmoji.where(category_id: nil)
      elsif (category_id = CustomEmojiCategory.where('"custom_emoji_categories"."name" ILIKE ?', "%#{CustomEmoji.sanitize_sql_like(value.strip)}%").take&.id)
        CustomEmoji.where(category_id: category_id)
      else
        CustomEmoji.none
      end
    when 'by_domain'
      CustomEmoji.where(domain: CustomEmoji.sanitize_sql_like(value.strip.downcase))
    when 'by_description'
      CustomEmoji.where("
        custom_emojis.license ILIKE :key OR
        custom_emojis.meta->>'misskey_license' ILIKE :key OR
        custom_emojis.copyright_notice ILIKE :key OR
        custom_emojis.credit_text ILIKE :key OR
        custom_emojis.usage_info ILIKE :key OR
        custom_emojis.description ILIKE :key OR
        custom_emojis.creator ILIKE :key",
        { key: "%#{CustomEmoji.sanitize_sql_like(value.strip)}%" }
      )
    when 'shortcode_match_type'
      @shortcode_match_type = value.to_sym if Form::CustomEmojiBatch::SHORTCODE_MATCH_TYPES.include?(value)
      CustomEmoji.all
    when 'shortcode'
      values = value.split(/[\s\u200B]+/).reject(&:blank?).map { |value| value.delete_prefix(':').delete_suffix(':') }

      if values.count == 1
        CustomEmoji.search(value, @shortcode_match_type)
      elsif values.count > 1
        CustomEmoji.where('custom_emojis.shortcode IN(?)', values)
      else
        CustomEmoji.all
      end
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
