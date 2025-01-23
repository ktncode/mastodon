# frozen_string_literal: true

class EmojisController < ApplicationController
  before_action :set_emoji
  before_action :set_cache_headers

  layout 'public'

  def show
    respond_to do |format|
      format.html do
        expires_in 10.seconds, public: true
      end

      format.json do
        expires_in 3.minutes, public: true
        render_with_cache json: @emoji, content_type: 'application/activity+json', serializer: ActivityPub::EmojiSerializer, adapter: ActivityPub::Adapter
      end
    end
  end

  private

  def set_emoji
    @emoji = CustomEmoji.includes(:category).local.find_by("LOWER(shortcode) = ?", params[:id].downcase) || CustomEmoji.includes(:category).local.find(params[:id])
  end
end
