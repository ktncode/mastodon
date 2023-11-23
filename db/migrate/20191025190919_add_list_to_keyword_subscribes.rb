class AddListToKeywordSubscribes < ActiveRecord::Migration[5.2]
  disable_ddl_transaction!

  def change
    add_reference :keyword_subscribes, :list, index: false
    add_foreign_key :keyword_subscribes, :lists, on_delete: :cascade, column: :list_id, validate: false
    add_index :keyword_subscribes, :list_id, algorithm: :concurrently
  end
end
