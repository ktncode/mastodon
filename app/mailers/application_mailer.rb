# frozen_string_literal: true

class ApplicationMailer < ActionMailer::Base
  layout 'mailer'

  helper :application
  helper :instance

  protected

  def locale_for_account(account)
    I18n.with_locale(account.user_locale || I18n.default_locale) do
      yield
    end
  end

  class DynamicSettingsInterceptor
    class << self
      def delivering_email(message)
        set_second_delivery_options(message) if use_second?(message)
      end

      private

      def use_second?(message)
        return unless Rails.configuration.x.second_smtp_settings[:address]
    
        Rails.configuration.x.domains_to_use_second_smtp&.any? { |domain| recipient_domains(message).include?(domain) }
      end
    
      def recipient_domains(message)
        message.recipients_addresses.map(&:domain).compact
      end
    
      def set_second_delivery_options(message)
        message.delivery_method.settings.merge!(Rails.configuration.x.second_smtp_settings)
      end
    end
  end

  register_interceptor DynamicSettingsInterceptor
end
