class AddOutboxNextPageURLToAccountStat < ActiveRecord::Migration[6.1]
  def change
    add_column :account_stats, :outbox_next_page_url, :string
  end
end
