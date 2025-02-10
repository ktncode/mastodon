# frozen_string_literal: true

class REST::CustomEmojiDetailSerializer < REST::CustomEmojiSerializer
  attributes :local, :domain, :updated_at, :last_fetched_at

  attribute :copy_permission, if: :copy_permission?
  attribute :license, if: :license?
  attribute :related_links, if: :related_links?
  attribute :usage_info, if: :usage_info?
  attribute :creator, if: :creator?
  attribute :description, if: :description?
  attribute :copyright_notice, if: :copyright_notice?
  attribute :credit_text, if: :credit_text?
  attribute :is_based_on, if: :is_based_on?
  attribute :sensitive, if: :sensitive?
  attribute :misskey_license, if: :misskey_license?
  attribute :org_category, if: :org_category?
  attribute :summary, if: :summary?

  def license
    if CustomEmoji::COMMON_LICENSES[object.license].present?
      %Q!<p><a href="#{object.license}" rel="nofollow noopener noreferrer" target="_blank">#{CustomEmoji::COMMON_LICENSES[object.license]}</a></p>!
    else
      Formatter.instance.linkify(object.license)
    end      
  end

  def misskey_license
    Formatter.instance.linkify(object.misskey_license)
  end

  def summary
    return @summary if defined?(@summary)

    @summary = Formatter.instance.format_summary(object).presence
  end

  def usage_info
    Formatter.instance.linkify(object.usage_info)
  end

  def creator
    Formatter.instance.linkify(object.creator)
  end

  def description
    Formatter.instance.linkify(object.description)
  end

  def copyright_notice
    Formatter.instance.linkify(object.copyright_notice)
  end

  def credit_text
    Formatter.instance.linkify(object.credit_text)
  end

  def related_links
    object.related_links.map do |link|
      Formatter.instance.linkify(link)
    end
  end

  def local
    object.local?
  end

  def domain
    object.local? ? Rails.configuration.x.local_domain : object.domain
  end

  def updated_at
    object.updated_at
  end

  def last_fetched_at
    object.last_fetched_at
  end

  def copy_permission?
    object.copy_permission.present?
  end

  def license?
    object.license.present?
  end

  def related_links?
    object.related_links.present?
  end

  def usage_info?
    object.usage_info.present?
  end

  def creator?
    object.creator.present?
  end

  def description?
    object.description.present?
  end

  def copyright_notice?
    object.copyright_notice.present?
  end

  def credit_text?
    object.credit_text.present?
  end

  def is_based_on?
    object.is_based_on.present?
  end

  def sensitive?
    object.sensitive
  end

  def misskey_license?
    object.misskey_license.present?
  end

  def summary?
    summary.present?
  end

  def org_category?
    object.org_category.present?
  end

end
