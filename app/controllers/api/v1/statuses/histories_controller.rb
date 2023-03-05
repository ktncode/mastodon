# frozen_string_literal: true

class Api::V1::Statuses::HistoriesController < Api::BaseController
  include Authorization

  before_action -> { authorize_if_got_token! :read, :'read:statuses' }

  def show
    render json: [], status: 200
  end
end
