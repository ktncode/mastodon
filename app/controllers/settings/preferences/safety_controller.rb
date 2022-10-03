# frozen_string_literal: true

class Settings::Preferences::SafetyController < Settings::PreferencesController
  private

  def after_update_redirect_path
    settings_preferences_safety_path
  end
end
