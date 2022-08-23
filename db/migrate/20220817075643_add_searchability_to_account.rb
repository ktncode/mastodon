require Rails.root.join('lib', 'mastodon', 'migration_helpers')

class AddSearchabilityToAccount < ActiveRecord::Migration[6.1]
  include Mastodon::MigrationHelpers

  disable_ddl_transaction!

  def up
    safety_assured { add_column_with_default :accounts, :searchability, :integer, default: 3, allow_null: false }
    safety_assured { add_index :accounts, :searchability, algorithm: :concurrently }
  end

  def down
    remove_index :accounts, :searchability
    remove_column :accounts, :searchability
  end
end
