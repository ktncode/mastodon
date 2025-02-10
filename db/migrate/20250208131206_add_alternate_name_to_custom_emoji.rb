require Rails.root.join('lib', 'mastodon', 'migration_helpers')

class AddAlternateNameToCustomEmoji < ActiveRecord::Migration[6.1]
  include Mastodon::MigrationHelpers

  disable_ddl_transaction!

  def up
    add_column :custom_emojis, :alternate_name, :string, default: '', null: false
    add_column :custom_emojis, :ruby, :string, default: '', null: false
    add_column :custom_emojis, :license, :string, default: '', null: false
    add_column :custom_emojis, :usage_info, :string, default: '', null: false
    add_column :custom_emojis, :creator, :string, default: '', null: false
    add_column :custom_emojis, :description, :string, default: '', null: false
    add_column :custom_emojis, :copyright_notice, :string, default: '', null: false
    add_column :custom_emojis, :credit_text, :string, default: '', null: false
    add_column :custom_emojis, :is_based_on, :string, default: '', null: false
    add_column :custom_emojis, :sensitive, :boolean, default: false, null: false
    add_column :custom_emojis, :related_links, :string, array: true, default: [], null: false
  end

  def down
    remove_column :custom_emojis, :related_links
    remove_column :custom_emojis, :sensitive
    remove_column :custom_emojis, :is_based_on
    remove_column :custom_emojis, :credit_text
    remove_column :custom_emojis, :copyright_notice
    remove_column :custom_emojis, :description
    remove_column :custom_emojis, :creator
    remove_column :custom_emojis, :usage_info
    remove_column :custom_emojis, :license
    remove_column :custom_emojis, :ruby
    remove_column :custom_emojis, :alternate_name
  end
end
