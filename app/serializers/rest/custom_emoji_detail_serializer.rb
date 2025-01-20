# frozen_string_literal: true

class REST::CustomEmojiDetailSerializer < REST::CustomEmojiSerializer
  attributes :copy_permission, :license, :misskey_license, :usage_info, :creator, :description, :copyright_notice, :credit_text, :is_based_on, :sensitive, :org_category
  attributes :local, :domain

  def local
    object.local?
  end

  def domain
    object.local? ? Rails.configuration.x.local_domain : object.domain
  end
end
