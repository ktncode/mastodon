class AddThumbhashToNodes < ActiveRecord::Migration[6.1]
  def change
    add_column :nodes, :thumbhash, :string
  end
end
