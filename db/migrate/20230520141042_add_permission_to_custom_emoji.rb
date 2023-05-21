require Rails.root.join('lib', 'mastodon', 'migration_helpers')

class AddPermissionToCustomEmoji < ActiveRecord::Migration[6.1]
  include Mastodon::MigrationHelpers

  disable_ddl_transaction!

  def up
    add_column :custom_emojis, :copy_permission, :integer, default: 0, null: false
    add_column :custom_emojis, :aliases, :string, array: true, default: [], null: false
    add_column :custom_emojis, :meta, :jsonb, default: {}, null: false
    safety_assured do
      execute <<-SQL
        CREATE OR REPLACE FUNCTION array_to_string_immutable (data text[], separator_string text) RETURNS text AS $$
        BEGIN
          RETURN CAST(array_to_string(data, separator_string) AS text);
        END
        $$ LANGUAGE plpgsql IMMUTABLE;

        ALTER TABLE custom_emojis ADD COLUMN combined_name text GENERATED ALWAYS AS (array_to_string_immutable(aliases || shortcode, chr(10))) STORED;
      SQL
      add_index :custom_emojis, :meta, using: 'gin', algorithm: :concurrently, name: :index_custom_emoji_on_meta
    end
  end

  def down
    remove_index :custom_emojis, name: :index_custom_emoji_on_meta
    remove_column :custom_emojis, :combined_name
    remove_column :custom_emojis, :meta
    remove_column :custom_emojis, :aliases
    remove_column :custom_emojis, :copy_permission
  end
end
