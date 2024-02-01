class CreateTagAccountMutes < ActiveRecord::Migration[6.1]
  def change
    create_table :tag_account_mutes do |t|
      t.references :tag, foreign_key: { on_delete: :cascade }
      t.references :account, foreign_key: { on_delete: :cascade }

      t.timestamps
    end
  end
end
