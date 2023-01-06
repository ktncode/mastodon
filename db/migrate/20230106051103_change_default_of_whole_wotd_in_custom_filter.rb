class ChangeDefaultOfWholeWotdInCustomFilter < ActiveRecord::Migration[6.1]
  def change
    change_column_default :custom_filters, :whole_word, from: true, to: false
  end
end
