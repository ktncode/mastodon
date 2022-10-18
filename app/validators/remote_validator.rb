# frozen_string_literal: true

class RemoteValidator < ActiveModel::EachValidator
  def validate_each(record, attribute, value)
    return unless value.is_a?(String)

    domain = begin
      if options[:acct]
        value.split('@')[1]
      else
        value
      end
    end

    return if value.blank?

    record.errors.add(attribute, I18n.t('domain_validator.local_domain')) if TagManager.instance.local_domain?(domain) || TagManager.instance.web_domain?(domain)
  end
end
