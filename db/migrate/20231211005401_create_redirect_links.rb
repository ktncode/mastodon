class CreateRedirectLinks < ActiveRecord::Migration[6.1]
  def change
    create_table :redirect_links do |t|
      t.string :url, null: false, index: { unique: true }
      t.string :redirected_url, null: false

      t.timestamps
    end
  end
end
