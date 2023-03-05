# frozen_string_literal: true

class Api::V1::Statuses::EmojiReactionsController < Api::BaseController
  include Authorization

  before_action -> { doorkeeper_authorize! :write, :'write:favourites' }
  before_action :require_user!
  before_action :set_status

  def update
    raise Mastodon::NotPermittedError if current_user.setting_disable_reactions

    if EmojiReactionService.new.call(current_account, @status, params[:id]).present?
      @status = Status.include_expired.find(params[:status_id])
    end

    render json: @status, serializer: REST::StatusSerializer
  end

  def destroy
    if UnEmojiReactionService.new.call(current_account, @status, params[:id], shortcode_only: true).present?
      @status = Status.include_expired.find(params[:status_id])
    end

    render json: @status, serializer: REST::StatusSerializer, relationships: StatusRelationshipsPresenter.new([@status], current_account.id, emoji_reactions_map: { @status.id => false })
  end

  private

  def set_status
    @status = Status.include_expired.find(params[:status_id])
    authorize @status, :show?
  rescue Mastodon::NotPermittedError
    not_found
  end
end
