# frozen_string_literal: true

class Api::V1::TagsController < Api::BaseController
  before_action -> { doorkeeper_authorize! :follow, :write, :'write:follows' }, except: :show
  before_action :require_user!, except: :show
  before_action :set_or_create_tag

  override_rate_limit_headers :follow, family: :follows

  def show
    render json: @tag, serializer: REST::TagSerializer
  end

  def follow
    FollowTag.create!(tag: @tag, account: current_account, rate_limit: true)
    render json: @tag, serializer: REST::TagSerializer
  end

  def unfollow
    FollowTag.find_by(account: current_account, tag: @tag)&.destroy!
    render json: @tag, serializer: REST::TagSerializer
  end

  private

  def set_or_create_tag
    return not_found unless Tag::HASHTAG_NAME_RE.match?(params[:id])
    @tag = Tag.find_normalized(params[:id]) || Tag.new(name: Tag.normalize(params[:id]))
  end
end
