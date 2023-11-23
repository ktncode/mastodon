class ValidateAddListToKeywordSubscribes < ActiveRecord::Migration[6.1]
  def change
    validate_foreign_key :keyword_subscribes, :lists
  end
end
