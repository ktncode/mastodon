class AddThumbhashToPreviewCards < ActiveRecord::Migration[6.1]
  def change
    add_column :preview_cards, :thumbhash, :string
  end
end
