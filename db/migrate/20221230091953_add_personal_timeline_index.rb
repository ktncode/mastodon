class AddPersonalTimelineIndex < ActiveRecord::Migration[6.1]
  disable_ddl_transaction!

  def up
    safety_assured { add_index :statuses, [:account_id, :id], where: 'visibility = 200 AND deleted_at IS NULL AND reblog_of_id IS NULL', order: { id: :desc }, algorithm: :concurrently, name: :index_statuses_personal_timeline }
  end

  def down
    remove_index :statuses, name: :index_statuses_personal_timeline
  end
end
