require Rails.root.join('lib', 'mastodon', 'migration_helpers')

class AddViewStyleToCustomEmojiCategory < ActiveRecord::Migration[6.1]
  include Mastodon::MigrationHelpers

  disable_ddl_transaction!

  def up
    safety_assured { add_column_with_default :custom_emoji_categories, :view_style, :integer, default: 0, allow_null: false }
  end

  def down
    remove_column :custom_emoji_categories, :view_style
  end
end
