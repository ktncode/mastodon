class ValidateAddListToAccountSubscribes < ActiveRecord::Migration[6.1]
  def change
    validate_foreign_key :account_subscribes, :lists
  end
end
