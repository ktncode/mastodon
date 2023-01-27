# frozen_string_literal: true

class Api::V2::SearchController < Api::BaseController
  include Authorization

  RESULTS_LIMIT = 20

  before_action -> { doorkeeper_authorize! :read, :'read:search' }
  before_action :require_user!

  def index
    @search = Search.new(search_results)
    render json: @search, serializer: compact? ? REST::CompactSearchSerializer : REST::SearchSerializer
  end

  private

  def search_results
    search_service_results.tap do |results|
      results[:statuses] = CompactStatusesPresenter.new(statuses: results[:statuses]) if compact?
    end
  end

  def search_service_results
    SearchService.new.call(
      params[:q],
      current_account,
      limit_param(RESULTS_LIMIT),
      search_params.merge(resolve: truthy_param?(:resolve), exclude_unreviewed: truthy_param?(:exclude_unreviewed), language: current_user.setting_default_language)
    )
  end

  def compact?
    truthy_param?(:compact)
  end

  def search_params
    params.permit(:type, :offset, :min_id, :max_id, :account_id, :with_profiles, :searchability, :compact)
  end
end
