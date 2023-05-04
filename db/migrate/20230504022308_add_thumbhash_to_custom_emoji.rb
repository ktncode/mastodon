class AddThumbhashToCustomEmoji < ActiveRecord::Migration[6.1]
  def change
    add_column :custom_emojis, :thumbhash, :string
  end
end
