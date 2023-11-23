class ValidateAddListToFollowTags < ActiveRecord::Migration[6.1]
  def change
    validate_foreign_key :follow_tags, :lists
  end
end
