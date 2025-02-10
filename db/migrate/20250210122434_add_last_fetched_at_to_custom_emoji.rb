class AddLastFetchedAtToCustomEmoji < ActiveRecord::Migration[6.1]
  def change
    add_column :custom_emojis, :last_fetched_at, :datetime
  end
end
