class AddURLToFeaturedTags < ActiveRecord::Migration[6.1]
  def change
    add_column :featured_tags, :url, :string
  end
end
