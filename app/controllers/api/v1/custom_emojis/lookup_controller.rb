# frozen_string_literal: true

class Api::V1::CustomEmojis::LookupController < Api::BaseController
  before_action -> { doorkeeper_authorize! :read, :'read:custom_emojis' }
  before_action :require_user!
  before_action :set_custom_emojis

  def index
    render json: @custom_emoji, serializer: REST::CustomEmojiDetailSerializer
  end

  private

  def set_custom_emojis
    @custom_emojis = ResolveCustomEmojiService.new.call(params[:shortcode], skip_fetch: true) || raise(ActiveRecord::RecordNotFound)
  end
end
