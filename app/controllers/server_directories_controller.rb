# frozen_string_literal: true

class ServerDirectoriesController < ApplicationController
  layout 'public'

  before_action :authenticate_user!, if: :whitelist_mode?
  before_action :require_enabled!
  before_action :set_servers

  skip_before_action :require_functional!, unless: :whitelist_mode?

  def index
    render :index
  end

  private

  def require_enabled!
    return not_found unless Setting.server_directory
  end

  def set_servers
    @servers = Node.available.page(params[:page]).per(15)
  end
end
