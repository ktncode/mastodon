require Rails.root.join('lib', 'mastodon', 'migration_helpers')

class AddPermissionToCustomEmoji < ActiveRecord::Migration[6.1]
  include Mastodon::MigrationHelpers

  disable_ddl_transaction!

  def up
    add_column :custom_emojis, :copy_permission, :integer, default: 0, null: false
    add_column :custom_emojis, :aliases, :string, array: true, default: [], null: false
    add_column :custom_emojis, :meta, :jsonb, default: {}, null: false
    add_index :custom_emojis, :meta, using: 'gin', algorithm: :concurrently, name: :index_custom_emoji_on_meta
  end

  def down
    remove_index :custom_emojis, name: :index_custom_emoji_on_meta
    remove_column :custom_emojis, :meta
    remove_column :custom_emojis, :aliases
    remove_column :custom_emojis, :copy_permission
  end
end
