# frozen_string_literal: true

class GeneratorsController < ApplicationController
  before_action :set_generator
  before_action :set_cache_headers

  def show
    respond_to do |format|
      format.json do
        expires_in 3.minutes, public: true
        render_with_cache json: @generator, content_type: 'application/activity+json', serializer: ActivityPub::GeneratorSerializer, adapter: ActivityPub::Adapter
      end
    end
  end

  private

  def set_generator
    @generator = Doorkeeper::Application.find(params[:id])
  end
end
