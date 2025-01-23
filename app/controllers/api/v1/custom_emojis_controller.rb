# frozen_string_literal: true

class Api::V1::CustomEmojisController < Api::BaseController
  before_action :set_emoji, except: :index
  skip_before_action :set_cache_headers

  def index
    expires_in 3.minutes, public: true
    render_with_cache(each_serializer: REST::CustomEmojiSerializer) { CustomEmoji.listed.includes(:category).reading_order }
  end

  def show
    render json: @custom_emoji, serializer: REST::CustomEmojiDetailSerializer
  end

  private

  def set_emoji
    shortcode, domain = params[:id].split('@', 2)
    
    if domain.nil? || domain.casecmp(Rails.configuration.x.local_domain).zero?
      @custom_emoji = CustomEmoji.includes(:category).local.find_by("LOWER(shortcode) = ?", shortcode.downcase) || CustomEmoji.includes(:category).local.find(params[:id])
    else
      @custom_emoji = CustomEmoji.includes(:category).find_by!("LOWER(shortcode) = ? AND domain = ?", shortcode.downcase, domain)
    end
  end
end
