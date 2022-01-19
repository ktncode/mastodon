# frozen_string_literal: true

class FanOutOnWriteService < BaseService
  include Redisable

  # Push a status into home and mentions feeds
  # @param [Status] status
  # @param [Hash] options
  # @option options [Boolean] update
  # @option options [Array<Integer>] silenced_account_ids
  def call(status, options = {})
    @status    = status
    @account   = status.account
    @options   = options
    @is_update = !!options[:update]

    check_race_condition!

    fan_out_to_local_recipients!
    fan_out_to_public_streams! if broadcastable?
    
    # 追加機能
    deliver_to_hashtag_followers!
    deliver_to_keyword_subscribers!
    deliver_to_domain_subscribers!
    deliver_to_subscribers!
    deliver_to_subscribers_lists!
    
    if @status.account.group?
      if @status.reblog?
        render_anonymous_reblog_payload
      else
        render_anonymous_payload
      end
      
      deliver_to_group!
    end
  end

  private

  def check_race_condition!
    # I don't know why but at some point we had an issue where
    # this service was being executed with status objects
    # that had a null visibility - which should not be possible
    # since the column in the database is not nullable.
    #
    # This check re-queues the service to be run at a later time
    # with the full object, if something like it occurs

    raise Mastodon::RaceConditionError if @status.visibility.nil?
  end

  def fan_out_to_local_recipients!
    deliver_to_self!
    notify_mentioned_accounts!

    case @status.visibility.to_sym
    when :public, :unlisted, :private
      deliver_to_all_followers!
      deliver_to_lists!
    when :limited
      deliver_to_mentioned_followers!
    else
      deliver_to_mentioned_followers!
      deliver_to_conversation!
    end
  end

  def fan_out_to_public_streams!
    broadcast_to_hashtag_streams!
    broadcast_to_public_streams!
  end

  def deliver_to_self!
    FeedManager.instance.push_to_home(@account, @status, update: update?) if @account.local?
  end

  def notify_mentioned_accounts!
    @status.active_mentions.where.not(id: @options[:silenced_account_ids] || []).joins(:account).merge(Account.local).select(:id, :account_id).reorder(nil).find_in_batches do |mentions|
      LocalNotificationWorker.push_bulk(mentions) do |mention|
        [mention.account_id, mention.id, 'Mention', :mention]
      end
    end
  end

  def deliver_to_all_followers!
    @account.followers_for_local_distribution.select(:id).reorder(nil).find_in_batches do |followers|
      FeedInsertWorker.push_bulk(followers) do |follower|
        [@status.id, follower.id, :home, update: update?]
      end
    end
  end

  def deliver_to_subscribers!
    feedInsertWorker = @status.account.high_priority? ? ::PriorityFeedInsertWorker : FeedInsertWorker
    
    @status.account.subscribers_for_local_distribution.with_reblog(@status.reblog?).with_media(@status.proper).select(:id, :account_id).reorder(nil).find_in_batches do |subscribings|
      feedInsertWorker.push_bulk(subscribings) do |subscribing|
        [@status.id, subscribing.account_id, 'home', { update: update? }]
      end
    end
  end

  def deliver_to_subscribers_lists!
    feedInsertWorker = @status.account.high_priority? ? ::PriorityFeedInsertWorker : FeedInsertWorker
    
    @status.account.list_subscribers_for_local_distribution.with_reblog(@status.reblog?).with_media(@status.proper).select(:id, :list_id).reorder(nil).find_in_batches do |subscribings|
      feedInsertWorker.push_bulk(subscribings) do |subscribing|
        [@status.id, subscribing.list_id, 'list', { update: update? }]
      end
    end
  end

  def deliver_to_domain_subscribers!
    feedInsertWorker = @status.account.high_priority? ? ::PriorityFeedInsertWorker : FeedInsertWorker
    
    # ドメイン購読者へのホームフィード配信
    DomainSubscribe.domain_to_home(@status.account.domain).with_reblog(@status.reblog?).with_media(@status.proper).select(:id, :account_id).find_in_batches do |subscribes|
      feedInsertWorker.push_bulk(subscribes) do |subscribe|
        [@status.id, subscribe.account_id, 'home', { update: update? }]
      end
    end
    
    # ドメイン購読者へのリストフィード配信
    DomainSubscribe.domain_to_list(@status.account.domain).with_reblog(@status.reblog?).with_media(@status.proper).select(:id, :list_id).find_in_batches do |subscribes|
      feedInsertWorker.push_bulk(subscribes) do |subscribe|
        [@status.id, subscribe.list_id, 'list', { update: update? }]
      end
    end
  end

  def deliver_to_hashtag_followers!
    return if @status.reblog?
    
    deliver_to_hashtag_followers_home
    deliver_to_hashtag_followers_list
  end
  
  def deliver_to_hashtag_followers_home
    feedInsertWorker = @status.account.high_priority? ? ::PriorityFeedInsertWorker : FeedInsertWorker
    
    feedInsertWorker.push_bulk(FollowTag.home.where(tag: @status.tags_without_mute).with_media(@status.proper).merge(visibility_scope(@status, FollowTag)).pluck(:account_id).uniq) do |follower|
      [@status.id, follower, 'home', { update: update? }]
    end
  end
  
  def deliver_to_hashtag_followers_list
    feedInsertWorker = @status.account.high_priority? ? ::PriorityFeedInsertWorker : FeedInsertWorker
    
    feedInsertWorker.push_bulk(FollowTag.list.where(tag: @status.tags_without_mute).with_media(@status.proper).merge(visibility_scope(@status, FollowTag)).pluck(:list_id).uniq) do |list_id|
      [@status.id, list_id, 'list', { update: update? }]
    end
  end
  
  def deliver_to_keyword_subscribers!
    return if @status.reblog?
    
    deliver_to_keyword_subscribers_home
    deliver_to_keyword_subscribers_list
  end
  
  def deliver_to_keyword_subscribers_home
    feedInsertWorker = @status.account.high_priority? ? ::PriorityFeedInsertWorker : FeedInsertWorker
    
    keyword_subscribes = KeywordSubscribe.active.with_media(@status).without_local_followed_home(@status.account).order(:account_id).merge(visibility_scope(@status, KeywordSubscribe))
    match_ids = keyword_subscribes.chunk(&:account_id).filter_map { |id, subscribes| id if subscribes.any? { |s| s.match?(@status.searchable_text) } }
    
    feedInsertWorker.push_bulk(match_ids) do |account_id|
      [@status.id, account_id, 'home', { update: update? }]
    end
  end
  
  def deliver_to_keyword_subscribers_list
    feedInsertWorker = @status.account.high_priority? ? ::PriorityFeedInsertWorker : FeedInsertWorker
    
    keyword_subscribes = KeywordSubscribe.active.with_media(@status).without_local_followed_list(@status.account).order(:list_id).merge(visibility_scope(@status, KeywordSubscribe))
    match_ids = keyword_subscribes.chunk(&:list_id).filter_map { |id, subscribes| id if subscribes.any? { |s| s.match?(@status.searchable_text) } }
    
    feedInsertWorker.push_bulk(match_ids) do |list_id|
      [@status.id, list_id, 'list', { update: update? }]
    end
  end
  
  def visibility_scope(status, klass)
    if status.public_visibility? && !status.account.silenced?
      klass.all
    else
      scope = klass.where(account_id: status.account_id).or(klass.where(account_id: status.mentions.select(:account_id)))
      scope = scope.or(klass.where(account_id: status.account.followers.local.select(:id))) unless %w(limited direct).include?(status.visibility)
      scope
    end
  end

  def deliver_to_group!
    payload = @status.reblog? ? @reblog_payload : @payload
    
    redis.publish("timeline:group:#{@status.account.id}", payload)
    
    @status.tags.pluck(:name).each do |hashtag|
      redis.publish("timeline:group:#{@status.account.id}:#{hashtag.mb_chars.downcase}", payload)
    end
    
    if @status.media_attachments.any?
      redis.publish("timeline:group:media:#{@status.account.id}", payload)
      
      @status.tags.pluck(:name).each do |hashtag|
        redis.publish("timeline:group:media:#{@status.account.id}:#{hashtag.mb_chars.downcase}", payload)
      end
    else
      redis.publish("timeline:group:nomedia:#{@status.account.id}", payload)
      
      @status.tags.pluck(:name).each do |hashtag|
        redis.publish("timeline:group:nomedia:#{@status.account.id}:#{hashtag.mb_chars.downcase}", payload)
      end
    end
  end
  
  def render_anonymous_payload
    @payload ||= Oj.dump(
      event: update? ? :'status.update' : :update,
      payload: InlineRenderer.render(@status, nil, :status)
    )
  end
  
  def render_anonymous_reblog_payload
    @reblog_payload ||= Oj.dump(
      event: update? ? :'status.update' : :update,
      payload: InlineRenderer.render(@status.reblog, nil, :status)
    )
  end

  def broadcast_to_hashtag_streams!
    @status.tags.pluck(:name).each do |hashtag|
      Redis.current.publish("timeline:hashtag:#{hashtag.mb_chars.downcase}", anonymous_payload)
      Redis.current.publish("timeline:hashtag:#{hashtag.mb_chars.downcase}:local", anonymous_payload) if @status.local?
    end
  end

  def broadcast_to_public_streams!
    return if @status.reply? && @status.in_reply_to_account_id != @account.id

    Redis.current.publish('timeline:public', anonymous_payload)
    Redis.current.publish(@status.local? ? 'timeline:public:local' : 'timeline:public:remote', anonymous_payload)

    if @status.media_attachments.any?
      Redis.current.publish('timeline:public:media', anonymous_payload)
      Redis.current.publish(@status.local? ? 'timeline:public:local:media' : 'timeline:public:remote:media', anonymous_payload)
    end
  end

  def deliver_to_conversation!
    AccountConversation.add_status(@account, @status) unless update?
  end

  def anonymous_payload
    @anonymous_payload ||= Oj.dump(
      event: update? ? :'status.update' : :update,
      payload: InlineRenderer.render(@status, nil, :status)
    )
  end

  def update?
    @is_update
  end

  def broadcastable?
    @status.public_visibility? && !@status.reblog? && !@account.silenced?
  end

  def deliver_to_self_included_lists(status)
    @feedInsertWorker.push_bulk(status.account.self_included_lists.pluck(:id)) do |list_id|
      [status.id, list_id, 'list']
    end
  end
end
