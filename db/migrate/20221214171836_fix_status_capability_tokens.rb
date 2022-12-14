class FixStatusCapabilityTokens < ActiveRecord::Migration[6.1]
  def up
    remove_foreign_key :status_capability_tokens, :statuses
    add_foreign_key :status_capability_tokens, :statuses, on_delete: :cascade, validate: false
  end

  def down
    remove_foreign_key :status_capability_tokens, :statuses
    add_foreign_key :status_capability_tokens, :statuses, validate: false
  end
end

class ValidateFixStatusCapabilityTokens < ActiveRecord::Migration[6.1]
  def up
    validate_foreign_key :status_capability_tokens, :statuses
  end

  def down
    validate_foreign_key :status_capability_tokens, :statuses
  end
end
