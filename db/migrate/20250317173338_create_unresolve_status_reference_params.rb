class CreateUnresolveStatusReferenceParams < ActiveRecord::Migration[6.1]
  def change
    create_table :unresolve_status_reference_params, id: false do |t|
      t.references :status, null: false, foreign_key: { on_delete: :cascade }
      t.jsonb :options

      t.timestamps
    end
  end
end
