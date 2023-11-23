class AddListToAccountSubscribes < ActiveRecord::Migration[5.2]
  disable_ddl_transaction!

  def change
    add_reference :account_subscribes, :list, index: false
    add_foreign_key :account_subscribes, :lists, on_delete: :cascade, column: :list_id, validate: false
    add_index :account_subscribes, :list_id, algorithm: :concurrently
  end
end
