# frozen_string_literal: true

class GenerateRemoteFeaturedTagURL < ActiveRecord::Migration[5.2]
  disable_ddl_transaction!

  def up
    FeaturedTag.includes(:account).where.not(account: Account.local).where(url: nil).find_each do |tag|
      tag.url = "#{tag.account.url}/tagged/#{URI.encode_www_form_component(tag.name)}"
      tag.save!
    end

    # WITH featured_tags_url AS (
    #   SELECT
    #       f.id,
    #       a.url || '/tagged/' || url_encode(t.name) AS url
    #   FROM
    #       featured_tags f
    #       join tags t ON f.tag_id = t.id
    #       join accounts a ON f.account_id = a.id
    #   WHERE
    #       f.url IS NULL
    #       AND a.domain IS NOT NULL
    # )
    # UPDATE
    #     featured_tags
    # SET
    #     url = featured_tags_url.url
    # FROM
    #     featured_tags_url
    # WHERE
    #     featured_tags.id = featured_tags_url.id;
  end

  def down
    #do nothing
  end
end
