class AddRedirectedURLToPreviewCard < ActiveRecord::Migration[6.1]
  def change
    add_column :preview_cards, :redirected_url, :string
  end
end
