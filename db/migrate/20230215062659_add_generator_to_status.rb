class AddGeneratorToStatus < ActiveRecord::Migration[6.1]
  def change
    safety_assured { add_reference :statuses, :generator, null: true, default: nil, foreign_key: { on_delete: :cascade }, index: false }
  end
end
