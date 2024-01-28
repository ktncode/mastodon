class AddPriorityToAccount < ActiveRecord::Migration[6.1]
  def change
    add_column :accounts, :priority, :integer, null: false, default: 0
  end
end
