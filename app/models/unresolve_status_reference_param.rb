# == Schema Information
#
# Table name: unresolve_status_reference_params
#
#  status_id  :bigint(8)        not null, primary key
#  options    :jsonb
#  created_at :datetime         not null
#  updated_at :datetime         not null
#
class UnresolveStatusReferenceParam < ApplicationRecord
  self.primary_key = :status_id
  belongs_to :status
end
