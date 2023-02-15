class CreateGenerators < ActiveRecord::Migration[6.1]
  def change
    create_table :generators do |t|
      t.string :uri, null: false, default: ''
      t.integer :type, null: false, default: 0
      t.string :name, null: false, default: ''
      t.string :website, null: true

      t.timestamps
    end
  end
end
