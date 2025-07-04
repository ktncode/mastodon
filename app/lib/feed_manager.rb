# frozen_string_literal: true

require 'singleton'

class FeedManager
  include Singleton
  include Redisable

  # Maximum number of items stored in a single feed
  MAX_ITEMS = 2000

  # Number of items in the feed since last reblog of status
  # before the new reblog will be inserted. Must be <= MAX_ITEMS
  # or the tracking sets will grow forever
  REBLOG_FALLOFF = 40

  # Get active account
  def active_accounts
    Account.joins(:user).where('users.current_sign_in_at > ?', User::ACTIVE_DURATION.ago)
  end

  # Execute block for every active account
  # @yield [Account]
  # @return [void]
  def with_active_accounts(&block)
    active_accounts.find_each(&block)
  end

  # Redis key of a feed
  # @param [Symbol] type
  # @param [Integer] id
  # @param [Symbol] subtype
  # @return [String]
  def key(type, id, subtype = nil)
    return "feed:#{type}:#{id}" unless subtype

    "feed:#{type}:#{id}:#{subtype}"
  end

  # Check if the status should not be added to a feed
  # @param [Symbol] timeline_type
  # @param [Status] status
  # @param [Account|List] receiver
  # @return [Boolean]
  def filter?(timeline_type, status, receiver)
    case timeline_type
    when :home
      filter_from_home?(status, receiver.id, build_crutches(receiver.id, [status]))
    when :list
      crutches = build_crutches(receiver.account_id, [status], receiver)
      filter_from_list?(status, receiver, crutches) || filter_from_home?(status, receiver.account_id, crutches, receiver)
    when :mentions
      filter_from_mentions?(status, receiver.id)
    when :status_references
      filter_from_status_references?(status, receiver.id)
    else
      false
    end
  end

  # Add a status to a home feed and send a streaming API update
  # @param [Account] account
  # @param [Status] status
  # @return [Boolean]
  def push_to_home(account, status)
    return false unless account.user&.signed_in_recently?
    return false unless add_to_feed(:home, account.id, status, account.user&.aggregates_reblogs?)

    trim(:home, account.id)
    PushUpdateWorker.perform_async(account.id, status.id, "timeline:#{account.id}") if push_update_required?("timeline:#{account.id}")
    true
  end

  # Remove a status from a home feed and send a streaming API update
  # @param [Account] account
  # @param [Status] status
  # @return [Boolean]
  def unpush_from_home(account, status, **options)
    return false unless remove_from_feed(:home, account.id, status, account.user&.aggregates_reblogs?)

    redis.publish("timeline:#{account.id}", Oj.dump(event: options[:mark_expired] ? :expire : :delete, payload: status.id.to_s))
    true
  end

  # Add a status to a list feed and send a streaming API update
  # @param [List] list
  # @param [Status] status
  # @return [Boolean]
  def push_to_list(list, status)
    return false if filter_from_list?(status, list, build_crutches(list.account_id, [status], list))
    return false unless list.account.user&.signed_in_recently?
    return false unless add_to_feed(:list, list.id, status, list.account.user&.aggregates_reblogs?)

    trim(:list, list.id)
    PushUpdateWorker.perform_async(list.account_id, status.id, "timeline:list:#{list.id}") if push_update_required?("timeline:list:#{list.id}")
    true
  end

  # Remove a status from a list feed and send a streaming API update
  # @param [List] list
  # @param [Status] status
  # @return [Boolean]
  def unpush_from_list(list, status, **options)
    return false unless remove_from_feed(:list, list.id, status, list.account.user&.aggregates_reblogs?)

    redis.publish("timeline:list:#{list.id}", Oj.dump(event: options[:mark_expired] ? :expire : :delete, payload: status.id.to_s))
    true
  end

  # Fill a home feed with an account's statuses
  # @param [Account] from_account
  # @param [Account] into_account
  # @return [void]
  def merge_into_home(from_account, into_account, options = {})
    return unless into_account.user&.signed_in_recently?

    options = { show_reblogs: true }.merge(options)

    if options[:list_id].nil?
      list = nil
      type = :home
      id   = into_account.id
    else
      list = List.find(options[:list_id])
      type = :list
      id   = options[:list_id]
    end

    timeline_key = key(type, id)
    aggregate    = into_account.user&.aggregates_reblogs?

    query        = from_account.statuses
    query        = query.where(visibility: options[:public_only] ? :public : [:public, :unlisted, :private])

    if options[:show_reblogs] && options[:media_only]
      query = begin
        Status
          .union(query.where(reblog_of_id: nil).joins(:media_attachments))
          .union(query.where.not(reblog_of_id: nil).joins({:reblog => :media_attachments}))
      end
    else
      query      = query.joins(:media_attachments) if options[:media_only]
      query      = query.where(reblog_of_id: nil) if options[:show_reblogs] == false
    end

    query        = query.includes(reblog: :account).limit(FeedManager::MAX_ITEMS / 4)

    if redis.zcard(timeline_key) >= FeedManager::MAX_ITEMS / 4
      oldest_home_score = redis.zrange(timeline_key, 0, 0).first.to_i
      query = query.where('statuses.id >= ?', oldest_home_score)
    end

    statuses = query.to_a
    crutches = build_crutches(into_account.id, statuses, list&.id)

    statuses.each do |status|
      next if filter_from_home?(status, into_account.id, crutches, list&.id)
      next if !list.nil? && filter_from_list?(status, list, crutches)

      add_to_feed(type, id, status, aggregate)
    end

    trim(type, id)
  end

  # Fill a list feed with an account's statuses
  # @param [Account] from_account
  # @param [List] list
  # @return [void]
  def merge_into_list(from_account, list, options = {})
    return unless list.account.user&.signed_in_recently?

    merge_into_home(from_account, list.account, options.merge(list_id: list.id))
  end

  # Remove an account's statuses from a home feed
  # @param [Account] from_account
  # @param [Account] into_account
  # @return [void]
  def unmerge_from_home(from_account, into_account)
    timeline_key      = key(:home, into_account.id)
    oldest_home_score = redis.zrange(timeline_key, 0, 0)&.first&.to_i || 0

    from_account.statuses.select('id, reblog_of_id').where('id >= ?', oldest_home_score).reorder(nil).find_each do |status|
      remove_from_feed(:home, into_account.id, status, into_account.user&.aggregates_reblogs?)
    end
  end

  # Remove an account's statuses from a list feed
  # @param [Account] from_account
  # @param [List] list
  # @return [void]
  def unmerge_from_list(from_account, list)
    timeline_key      = key(:list, list.id)
    oldest_list_score = redis.zrange(timeline_key, 0, 0)&.first&.to_i || 0

    from_account.statuses.select('id, reblog_of_id').where('id >= ?', oldest_list_score).reorder(nil).find_each do |status|
      remove_from_feed(:list, list.id, status, list.account.user&.aggregates_reblogs?)
    end
  end

  # Clear all statuses from or mentioning target_account from a home feed
  # @param [Account] account
  # @param [Account] target_account
  # @return [void]
  def clear_from_home(account, target_account)
    timeline_key        = key(:home, account.id)
    timeline_status_ids = redis.zrange(timeline_key, 0, -1)
    statuses            = Status.where(id: timeline_status_ids).select(:id, :reblog_of_id, :account_id).to_a
    reblogged_ids       = Status.where(id: statuses.map(&:reblog_of_id).compact, account: target_account).pluck(:id)
    with_mentions_ids   = Mention.active.where(status_id: statuses.flat_map { |s| [s.id, s.reblog_of_id] }.compact, account: target_account).pluck(:status_id)

    target_statuses = statuses.select do |status|
      status.account_id == target_account.id || reblogged_ids.include?(status.reblog_of_id) || with_mentions_ids.include?(status.id) || with_mentions_ids.include?(status.reblog_of_id)
    end

    target_statuses.each do |status|
      unpush_from_home(account, status)
    end
  end

  # Clear all statuses from or mentioning target_account from a list feed
  # @param [List] list
  # @param [Account] target_account
  # @return [void]
  def clear_from_list(list, target_account)
    timeline_key        = key(:list, list.id)
    timeline_status_ids = redis.zrange(timeline_key, 0, -1)
    statuses            = Status.where(id: timeline_status_ids).select(:id, :reblog_of_id, :account_id).to_a
    reblogged_ids       = Status.where(id: statuses.map(&:reblog_of_id).compact, account: target_account).pluck(:id)
    with_mentions_ids   = Mention.active.where(status_id: statuses.flat_map { |s| [s.id, s.reblog_of_id] }.compact, account: target_account).pluck(:status_id)

    target_statuses = statuses.select do |status|
      status.account_id == target_account.id || reblogged_ids.include?(status.reblog_of_id) || with_mentions_ids.include?(status.id) || with_mentions_ids.include?(status.reblog_of_id)
    end

    target_statuses.each do |status|
      unpush_from_list(list, status)
    end
  end

  # Clear all statuses from or mentioning target_account from an account's lists
  # @param [Account] account
  # @param [Account] target_account
  # @return [void]
  def clear_from_lists(account, target_account)
    List.where(account: account).each do |list|
      clear_from_list(list, target_account)
    end
  end

  # Populate home feed of account from scratch
  # @param [Account] account
  # @return [void]
  def populate_home(account)
    limit        = FeedManager::MAX_ITEMS / 2
    aggregate    = account.user&.aggregates_reblogs?
    timeline_key = key(:home, account.id)
    over_limit = false

    account.statuses.limit(limit).each do |status|
      add_to_feed(:home, account.id, status, aggregate)
    end

    account.delivery_following.includes(:account_stat).find_each do |target_account|
      query = target_account.statuses.list_eligible_visibility.includes(reblog: :account).limit(limit)

      over_limit ||= redis.zcard(timeline_key) >= limit
      if over_limit
        oldest_home_score = redis.zrange(timeline_key, 0, 0, with_scores: true).first.last.to_i
        last_status_score = Mastodon::Snowflake.id_at(target_account.last_status_at, with_random: false)

        # If the feed is full and this account has not posted more recently
        # than the last item on the feed, then we can skip the whole account
        # because none of its statuses would stay on the feed anyway
        next if last_status_score < oldest_home_score

        # No need to get older statuses
        query = query.where(id: oldest_home_score...)
      end

      statuses = query.to_a
      next if statuses.empty?

      crutches = build_crutches(account.id, statuses)

      statuses.each do |status|
        next if filter_from_home?(status, account.id, crutches)

        add_to_feed(:home, account.id, status, aggregate)
      end

      trim(:home, account.id)
    end
  end

  # Completely clear multiple feeds at once
  # @param [Symbol] type
  # @param [Array<Integer>] ids
  # @return [void]
  def clean_feeds!(type, ids)
    reblogged_id_sets = {}

    redis.pipelined do
      ids.each do |feed_id|
        redis.del(key(type, feed_id))
        reblog_key = key(type, feed_id, 'reblogs')
        # We collect a future for this: we don't block while getting
        # it, but we can iterate over it later.
        reblogged_id_sets[feed_id] = redis.zrange(reblog_key, 0, -1)
        redis.del(reblog_key)
      end
    end

    # Remove all of the reblog tracking keys we just removed the
    # references to.
    redis.pipelined do
      reblogged_id_sets.each do |feed_id, future|
        future.value.each do |reblogged_id|
          reblog_set_key = key(type, feed_id, "reblogs:#{reblogged_id}")
          redis.del(reblog_set_key)
        end
      end
    end
  end

  private

  # Trim a feed to maximum size by removing older items
  # @param [Symbol] type
  # @param [Integer] timeline_id
  # @return [void]
  def trim(type, timeline_id)
    timeline_key = key(type, timeline_id)
    reblog_key   = key(type, timeline_id, 'reblogs')

    # Remove any items past the MAX_ITEMS'th entry in our feed
    redis.zremrangebyrank(timeline_key, 0, -(FeedManager::MAX_ITEMS + 1))

    # Get the score of the REBLOG_FALLOFF'th item in our feed, and stop
    # tracking anything after it for deduplication purposes.
    falloff_rank  = FeedManager::REBLOG_FALLOFF
    falloff_range = redis.zrevrange(timeline_key, falloff_rank, falloff_rank, with_scores: true)
    falloff_score = falloff_range&.first&.last&.to_i

    return if falloff_score.nil?

    # Get any reblogs we might have to clean up after.
    redis.zrangebyscore(reblog_key, 0, falloff_score).each do |reblogged_id|
      # Remove it from the set of reblogs we're tracking *first* to avoid races.
      redis.zrem(reblog_key, reblogged_id)
      # Just drop any set we might have created to track additional reblogs.
      # This means that if this reblog is deleted, we won't automatically insert
      # another reblog, but also that any new reblog can be inserted into the
      # feed.
      redis.del(key(type, timeline_id, "reblogs:#{reblogged_id}"))
    end
  end

  # Check if there is a streaming API client connected
  # for the given feed
  # @param [String] timeline_key
  # @return [Boolean]
  def push_update_required?(timeline_key)
    redis.exists?("subscribed:#{timeline_key}")
  end

  # Check if the account is blocking or muting any of the given accounts
  # @param [Integer] receiver_id
  # @param [Array<Integer>] account_ids
  # @param [Symbol] context
  def blocks_or_mutes?(receiver_id, account_ids, context)
    Block.where(account_id: receiver_id, target_account_id: account_ids).any? ||
      (context == :home ? Mute.where(account_id: receiver_id, target_account_id: account_ids).any? : Mute.where(account_id: receiver_id, target_account_id: account_ids, hide_notifications: true).any?)
  end

  # Check if status should not be added to the home feed
  # @param [Status] status
  # @param [Integer] receiver_id
  # @param [Hash] crutches
  # @return [Boolean]
  def filter_from_home?(status, receiver_id, crutches, list_id = nil)
    return false if receiver_id == status.account_id
    return true  if status.reply? && (status.in_reply_to_id.nil? || status.in_reply_to_account_id.nil?)

    check_for_blocks = crutches[:active_mentions][status.id] || []
    check_for_blocks.concat([status.account_id])

    if status.reblog?
      check_for_blocks.concat([status.reblog.account_id])
      check_for_blocks.concat(crutches[:active_mentions][status.reblog_of_id] || [])
    end

    return true if check_for_blocks.any? { |target_account_id| crutches[:blocking][target_account_id] || crutches[:muting][target_account_id] }
    return true if crutches[:blocked_by][status.account_id]

    if status.reblog?                                                                                                            # Filter out a reblog
      should_filter   = crutches[:hiding_reblogs][status.account_id]                                                             # if the reblogger's reblogs are suppressed
      should_filter ||= crutches[:domain_blocking][status.account.domain]                                                        # or the reblogger's domain is blocked
      should_filter ||= crutches[:blocked_by][status.reblog.account_id]                                                          # or if the author of the reblogged status is blocking me
      should_filter ||= crutches[:domain_blocking_r][status.reblog.account.domain]                                               # or the author's domain is blocked

      return !!should_filter
    else
      if status.reply?                                                                                                           # Filter out a reply
        should_filter   = !crutches[:following_reply_to][status.in_reply_to_account_id]                                          # and I'm not following the person it's a reply to
        should_filter &&= receiver_id != status.in_reply_to_account_id                                                           # and it's not a reply to me
        should_filter &&= status.account_id != status.in_reply_to_account_id                                                     # and it's not a self-reply
        should_filter &&= !status.tags.any? { |tag| crutches[:following_tag_by][tag.id] }                                        # and It's not follow tag
        should_filter &&= !KeywordSubscribe.match?(status.searchable_text, account_id: receiver_id, list_id: list_id)            # and It's not subscribe keywords
        should_filter &&= !crutches[:domain_subscribe][status.account.domain]                                                    # and It's not domain subscribes
        
        return true if should_filter
      end

      should_filter   = crutches[:domain_blocking][status.account.domain]
      should_filter &&= !crutches[:following][status.account_id]
      should_filter &&= !crutches[:account_subscribe][status.account_id]
      should_filter &&= !KeywordSubscribe.match?(status.searchable_text, account_id: receiver_id, as_ignore_block: true, list_id: list_id)

      return !!should_filter
    end
  end

  # Check if status should not be added to the mentions feed
  # @see NotifyService
  # @param [Status] status
  # @param [Integer] receiver_id
  # @return [Boolean]
  def filter_from_mentions?(status, receiver_id)
    return true if receiver_id == status.account_id

    # This filter is called from NotifyService, but already after the sender of
    # the notification has been checked for mute/block. Therefore, it's not
    # necessary to check the author of the toot for mute/block again
    check_for_blocks = status.active_mentions.pluck(:account_id)
    check_for_blocks.concat([status.in_reply_to_account]) if status.reply? && !status.in_reply_to_account_id.nil?

    should_filter   = blocks_or_mutes?(receiver_id, check_for_blocks, :mentions)                                                         # Filter if it's from someone I blocked, in reply to someone I blocked, or mentioning someone I blocked (or muted)
    should_filter ||= (status.account.silenced? && !Follow.where(account_id: receiver_id, target_account_id: status.account_id).exists?) # of if the account is silenced and I'm not following them

    should_filter
  end

  # Check if status should not be added to the status reference feed
  # @see NotifyService
  # @param [Status] status
  # @param [Integer] receiver_id
  # @return [Boolean]
  def filter_from_status_references?(status, receiver_id)
    return true if receiver_id == status.account_id
    return true unless StatusPolicy.new(Account.find(receiver_id), status).subscribe?

    # This filter is called from NotifyService, but already after the sender of
    # the notification has been checked for mute/block. Therefore, it's not
    # necessary to check the author of the toot for mute/block again
    check_for_blocks = status.active_mentions.pluck(:account_id)
    check_for_blocks.concat([status.in_reply_to_account]) if status.reply? && !status.in_reply_to_account_id.nil?

    should_filter   = blocks_or_mutes?(receiver_id, check_for_blocks, :status_references)                                                # Filter if it's from someone I blocked, in reply to someone I blocked, or mentioning someone I blocked (or muted)
    should_filter ||= (status.account.silenced? && !Follow.where(account_id: receiver_id, target_account_id: status.account_id).exists?) # of if the account is silenced and I'm not following them

    should_filter
  end

  # Check if status should not be added to the list feed
  # @param [Status] status
  # @param [List] list
  # @return [Boolean]
  def filter_from_list?(status, list, crutches)
    if status.reply? && status.in_reply_to_account_id != status.account_id
      should_filter   = status.in_reply_to_account_id != list.account_id
      should_filter &&= !list.show_followed?
      should_filter &&= !(list.show_list? && ListAccount.where(list_id: list.id, account_id: status.in_reply_to_account_id).exists?)
      should_filter &&= !status.tags.any? { |tag| crutches[:following_tag_by][tag.id] }                                        # and It's not follow tag
      should_filter &&= !KeywordSubscribe.match?(status.searchable_text, account_id: list.account_id, list_id: list.id)        # and It's not subscribe keywords
      should_filter &&= !crutches[:domain_subscribe][status.account.domain]                                                    # and It's not domain subscribes

      return !!should_filter
    end

    false
  end

  # Adds a status to an account's feed, returning true if a status was
  # added, and false if it was not added to the feed. Note that this is
  # an internal helper: callers must call trim or push updates if
  # either action is appropriate.
  # @param [Symbol] timeline_type
  # @param [Integer] account_id
  # @param [Status] status
  # @param [Boolean] aggregate_reblogs
  # @return [Boolean]
  def add_to_feed(timeline_type, account_id, status, aggregate_reblogs = true)
    timeline_key = key(timeline_type, account_id)
    reblog_key   = key(timeline_type, account_id, 'reblogs')

    if status.reblog? && (aggregate_reblogs.nil? || aggregate_reblogs)
      # If the original status or a reblog of it is within
      # REBLOG_FALLOFF statuses from the top, do not re-insert it into
      # the feed
      rank = redis.zrevrank(timeline_key, status.reblog_of_id)

      return false if !rank.nil? && rank < FeedManager::REBLOG_FALLOFF

      # The ordered set at `reblog_key` holds statuses which have a reblog
      # in the top `REBLOG_FALLOFF` statuses of the timeline
      if redis.zadd(reblog_key, status.id, status.reblog_of_id, nx: true)
        # This is not something we've already seen reblogged, so we
        # can just add it to the feed (and note that we're reblogging it).
        redis.zadd(timeline_key, status.id, status.id)
      else
        # Another reblog of the same status was already in the
        # REBLOG_FALLOFF most recent statuses, so we note that this
        # is an "extra" reblog, by storing it in reblog_set_key.
        reblog_set_key = key(timeline_type, account_id, "reblogs:#{status.reblog_of_id}")
        redis.sadd(reblog_set_key, status.id)
        return false
      end
    else
      # A reblog may reach earlier than the original status because of the
      # delay of the worker deliverying the original status, the late addition
      # by merging timelines, and other reasons.
      # If such a reblog already exists, just do not re-insert it into the feed.
      return false unless redis.zscore(reblog_key, status.id).nil?

      redis.zadd(timeline_key, status.id, status.id)
    end

    true
  end

  # Removes an individual status from a feed, correctly handling cases
  # with reblogs, and returning true if a status was removed. As with
  # `add_to_feed`, this does not trigger push updates, so callers must
  # do so if appropriate.
  # @param [Symbol] timeline_type
  # @param [Integer] account_id
  # @param [Status] status
  # @param [Boolean] aggregate_reblogs
  # @return [Boolean]
  def remove_from_feed(timeline_type, account_id, status, aggregate_reblogs = true)
    timeline_key = key(timeline_type, account_id)
    reblog_key   = key(timeline_type, account_id, 'reblogs')

    if status.reblog? && (aggregate_reblogs.nil? || aggregate_reblogs)
      # 1. If the reblogging status is not in the feed, stop.
      status_rank = redis.zrevrank(timeline_key, status.id)
      return false if status_rank.nil?

      # 2. Remove reblog from set of this status's reblogs.
      reblog_set_key = key(timeline_type, account_id, "reblogs:#{status.reblog_of_id}")

      redis.srem(reblog_set_key, status.id)
      redis.zrem(reblog_key, status.reblog_of_id)
      # 3. Re-insert another reblog or original into the feed if one
      # remains in the set. We could pick a random element, but this
      # set should generally be small, and it seems ideal to show the
      # oldest potential such reblog.
      other_reblog = redis.smembers(reblog_set_key).map(&:to_i).min

      redis.zadd(timeline_key, other_reblog, other_reblog) if other_reblog
      redis.zadd(reblog_key, other_reblog, status.reblog_of_id) if other_reblog

      # 4. Remove the reblogging status from the feed (as normal)
      # (outside conditional)
    else
      # If the original is getting deleted, no use for reblog references
      redis.del(key(timeline_type, account_id, "reblogs:#{status.id}"))
      redis.zrem(reblog_key, status.id)
    end

    redis.zrem(timeline_key, status.id)
  end

  # Pre-fetch various objects and relationships for given statuses that
  # are going to be checked by the filtering methods
  # @param [Integer] receiver_id
  # @param [Array<Status>] statuses
  # @return [Hash]
  def build_crutches(receiver_id, statuses, list_id = nil)
    crutches = {}

    crutches[:active_mentions] = Mention.active.where(status_id: statuses.flat_map { |s| [s.id, s.reblog_of_id] }.compact).pluck(:status_id, :account_id).each_with_object({}) { |(id, account_id), mapping| (mapping[id] ||= []).push(account_id) }

    check_for_blocks = statuses.flat_map do |s|
      arr = crutches[:active_mentions][s.id] || []
      arr.concat([s.account_id])

      if s.reblog? && s.reblog.present?
        arr.push(s.reblog.account_id)
        arr.concat(crutches[:active_mentions][s.reblog_of_id] || [])
      end

      arr
    end

    crutches[:following]          = Follow.where(account_id: receiver_id, target_account_id: statuses.map(&:account_id).compact).pluck(:target_account_id).index_with(true)
    crutches[:following_reply_to] = Follow.where(account_id: receiver_id, target_account_id: statuses.map(&:in_reply_to_account_id).compact).pluck(:target_account_id).index_with(true)
    crutches[:hiding_reblogs]     = Follow.where(account_id: receiver_id, target_account_id: statuses.map { |s| s.account_id if s.reblog? }.compact, show_reblogs: false).pluck(:target_account_id).index_with(true)
    crutches[:blocking]           = Block.where(account_id: receiver_id, target_account_id: check_for_blocks).pluck(:target_account_id).index_with(true)
    crutches[:muting]             = Mute.where(account_id: receiver_id, target_account_id: check_for_blocks).pluck(:target_account_id).index_with(true)
    crutches[:domain_blocking]    = AccountDomainBlock.where(account_id: receiver_id, domain: statuses.map { |s| s.account&.domain }.compact).pluck(:domain).index_with(true)
    crutches[:domain_blocking_r]  = AccountDomainBlock.where(account_id: receiver_id, domain: statuses.map { |s| s.reblog&.account&.domain }.compact).pluck(:domain).index_with(true)
    crutches[:blocked_by]         = Block.where(target_account_id: receiver_id, account_id: statuses.flat_map { |s| [s&.account_id, s.reblog&.account_id] }.compact).pluck(:account_id).index_with(true)
    crutches[:following_tag_by]   = FollowTag.where(account_id: receiver_id, tag: statuses.map { |s| s.tags }.flatten.uniq.compact, list_id: list_id).pluck(:tag_id).index_with(true)
    crutches[:domain_subscribe]   = DomainSubscribe.where(account_id: receiver_id, list_id: list_id, domain: statuses.map { |s| s&.account&.domain }.compact).pluck(:domain).index_with(true)
    crutches[:account_subscribe]  = AccountSubscribe.where(account_id: receiver_id, target_account_id: statuses.map(&:account_id).compact, list_id: list_id).pluck(:target_account_id).index_with(true)
    crutches
  end
end
