# frozen_string_literal: true

class Api::V1::CustomEmojisController < Api::BaseController
  skip_before_action :set_cache_headers

  def index
    expires_in 3.minutes, public: true
    render_with_cache(each_serializer: REST::CustomEmojiSerializer) { CustomEmoji.listed.includes(:category).reading_order }
  end

  def show
    @custom_emoji = CustomEmoji.listed.includes(:category).find(params[:id])
    render json: @custom_emoji, serializer: REST::CustomEmojiDetailSerializer
  end
end
