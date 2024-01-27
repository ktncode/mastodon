# frozen_string_literal: true

class FirstAidController < ApplicationController
  include Authorization

  layout 'admin'

  before_action :authenticate_user!
  before_action :set_body_classes
  before_action :set_setting, only: [:reset_frequently_used_emojis, :reset_web_settings]
  before_action :set_settings, only: [:reset_server_settings]

  def show; end

  def reset_web_settings
    frequentlyUsedEmojis = @setting&.data['frequentlyUsedEmojis']
    @setting.update(data: frequentlyUsedEmojis.present? ? { 'frequentlyUsedEmojis' => frequentlyUsedEmojis } : {})
    redirect_to first_aid_path, notice: I18n.t('generic.changes_saved_msg')
  end

  def reset_server_settings
    @settings.destroy_all
    redirect_to first_aid_path, notice: I18n.t('generic.changes_saved_msg')
  end

  def reset_frequently_used_emojis
    @setting.data.delete('frequentlyUsedEmojis')
    if @setting.save
      redirect_to first_aid_path, notice: I18n.t('generic.changes_saved_msg')
    else
      redirect_to first_aid_path
    end
  end

  def reset_counters
    current_account.recount
    current_account.featured_tags.map(&:recount)
    redirect_to first_aid_path, notice: I18n.t('generic.changes_saved_msg')
  end

  def reset_home_feed
    PrecomputeFeedService.new.call(current_account)
    redirect_to first_aid_path, notice: I18n.t('generic.changes_saved_msg')
  end

  private

  def set_body_classes
    @body_classes = 'admin'
  end

  def set_setting
    @setting = Web::Setting.find_by(user: current_user)
  end

  def set_settings
    @settings = Setting.unscoped.where(thing_type: 'User', thing_id: current_user.id)
  end
end
