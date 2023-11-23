class AddListToFollowTags < ActiveRecord::Migration[5.2]
  disable_ddl_transaction!

  def change
    add_reference :follow_tags, :list, index: false
    add_foreign_key :follow_tags, :lists, on_delete: :cascade, column: :list_id, validate: false
    add_index :follow_tags, :list_id, algorithm: :concurrently
  end
end
