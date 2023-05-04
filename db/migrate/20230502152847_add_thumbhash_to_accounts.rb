class AddThumbhashToAccounts < ActiveRecord::Migration[6.1]
  def change
    add_column :accounts, :avatar_thumbhash, :string
    add_column :accounts, :header_thumbhash, :string
  end
end
