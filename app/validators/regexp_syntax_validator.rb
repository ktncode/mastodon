# frozen_string_literal: true

class RegexpSyntaxValidator < ActiveModel::EachValidator
  def validate_each(record, attribute, value)
    return if value.blank?

    begin
      Regexp.compile(value)
    rescue RegexpError => exception
      record.errors.add(attribute, I18n.t('applications.invalid_regexp', message: exception.message))
    end
  end
end
