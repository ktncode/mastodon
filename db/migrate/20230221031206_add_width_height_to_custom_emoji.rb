class AddWidthHeightToCustomEmoji < ActiveRecord::Migration[6.1]
  def change
    add_column :custom_emojis, :width, :integer, null: true, default: nil
    add_column :custom_emojis, :height, :integer, null: true, default: nil
  end
end
