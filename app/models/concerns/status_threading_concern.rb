# frozen_string_literal: true

module StatusThreadingConcern
  extend ActiveSupport::Concern

  def ancestors(limit, account_id = nil)
    find_statuses_from_tree_path(ancestor_ids(limit), account_id)
  end

  def descendants(limit, account_id = nil, max_child_id = nil, since_child_id = nil, depth = nil)
    find_statuses_from_tree_path(descendant_ids(limit, max_child_id, since_child_id, depth), account_id, promote: true)
  end

  def thread_references(limit, account_id = nil, max_child_id = nil, since_child_id = nil, depth = nil)
    find_statuses_from_tree_path(references_ids(limit, max_child_id, since_child_id, depth), account_id)
  end

  def self_replies(limit)
    account.statuses.where(in_reply_to_id: id, visibility: [:public, :unlisted]).reorder(id: :asc).limit(limit)
  end

  private

  def ancestor_ids(limit)
    ancestor_ids_account_ids(limit).map(&:first).reverse!
  end

  def descendant_ids(limit, max_child_id, since_child_id, depth)
    descendant_ids_account_ids(limit, max_child_id, since_child_id, depth).map(&:first)
  end

  def references_ids(limit, max_child_id, since_child_id, depth)
    ancestors      = ancestor_ids_account_ids(limit)
    descendants    = descendant_ids_account_ids(limit, max_child_id, since_child_id, depth)
    self_reply_ids = []
    self_reply_ids += ancestors  .take_while { |id, status_account_id| status_account_id == account_id }.map(&:first)
    self_reply_ids += descendants.take_while { |id, status_account_id| status_account_id == account_id }.map(&:first)
    reference_ids  = StatusReference.where(status_id: [id] + self_reply_ids).pluck(:target_status_id)
    reference_ids  -= ancestors.map(&:first) + descendants.map(&:first)

    reference_ids.sort!.reverse!
  end

  def ancestor_ids_account_ids(limit)
    key = "ancestors:#{id}"
    ancestors = Rails.cache.fetch(key)

    if ancestors.nil? || ancestors[:limit] < limit
      ancestor_statuses(limit).pluck(:id, :account_id).tap do |ids_account_ids|
        Rails.cache.write key, limit: limit, ids: ids_account_ids
      end
    else
      ancestors[:ids].last(limit)
    end
  end

  def ancestor_statuses(limit)
    Status.find_by_sql([<<-SQL.squish, id: in_reply_to_id, limit: limit])
      WITH RECURSIVE search_tree(id, account_id, in_reply_to_id, path)
      AS (
        SELECT id, account_id, in_reply_to_id, ARRAY[id]
        FROM statuses
        WHERE id = :id
        UNION ALL
        SELECT statuses.id, statuses.account_id, statuses.in_reply_to_id, path || statuses.id
        FROM search_tree
        JOIN statuses ON statuses.id = search_tree.in_reply_to_id
        WHERE NOT statuses.id = ANY(path)
      )
      SELECT id, account_id
      FROM search_tree
      ORDER BY path
      LIMIT :limit
    SQL
  end

  def descendant_ids_account_ids(limit, max_child_id, since_child_id, depth)
    @descendant_statuses ||= descendant_statuses(limit, max_child_id, since_child_id, depth).pluck(:id, :account_id)
  end

  def descendant_statuses(limit, max_child_id, since_child_id, depth)
    # use limit + 1 and depth + 1 because 'self' is included
    depth += 1 if depth.present?
    limit += 1 if limit.present?

    descendants_with_self = Status.find_by_sql([<<-SQL.squish, id: id, limit: limit, max_child_id: max_child_id, since_child_id: since_child_id, depth: depth])
      WITH RECURSIVE search_tree(id, account_id, path)
      AS (
        SELECT id, account_id, ARRAY[id]
        FROM statuses
        WHERE id = :id AND COALESCE(id < :max_child_id, TRUE) AND COALESCE(id > :since_child_id, TRUE)
        UNION ALL
        SELECT statuses.id, statuses.account_id, path || statuses.id
        FROM search_tree
        JOIN statuses ON statuses.in_reply_to_id = search_tree.id
        WHERE COALESCE(array_length(path, 1) < :depth, TRUE) AND NOT statuses.id = ANY(path)
      )
      SELECT id, account_id
      FROM search_tree
      ORDER BY path
      LIMIT :limit
    SQL

    descendants_with_self - [self]
  end

  def find_statuses_from_tree_path(ids, account_id, promote: false)
    statuses = Status.permitted_statuses_from_ids(ids, account_id)

    # Order ancestors/descendants by tree path
    statuses.sort_by! { |status| ids.index(status.id) }

    # Bring self-replies to the top
    if promote
      promote_by!(statuses) { |status| status.in_reply_to_account_id == status.account_id }
    else
      statuses
    end
  end

  def promote_by!(arr)
    insert_at = arr.find_index { |item| !yield(item) }

    return arr if insert_at.nil?

    arr.each_with_index do |item, index|
      next if index <= insert_at || !yield(item)

      arr.insert(insert_at, arr.delete_at(index))
      insert_at += 1
    end

    arr
  end
end
