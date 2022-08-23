class AddSearchabilityToStatus < ActiveRecord::Migration[6.1]
  disable_ddl_transaction!

  def up
    add_column :statuses, :searchability, :integer
    add_index :statuses, [:account_id, :id], where: 'deleted_at IS NULL AND expired_at IS NULL AND reblog_of_id IS NULL AND searchability IN (0, 1, 2)', order: { id: :desc }, algorithm: :concurrently, name: :index_statuses_private_searchable
  end

  def down
    remove_index :statuses, name: :index_statuses_private_searchable
    remove_column :statuses, :searchability
  end
end
