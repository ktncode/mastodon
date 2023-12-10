# frozen_string_literal: true
# == Schema Information
#
# Table name: redirect_links
#
#  id             :bigint(8)        not null, primary key
#  url            :string           not null
#  redirected_url :string           not null
#  created_at     :datetime         not null
#  updated_at     :datetime         not null
#

class RedirectLink < ApplicationRecord
  validates :url, url: true, uniqueness: true, presence: true
  validates :redirected_url, url: true, presence: true
end
