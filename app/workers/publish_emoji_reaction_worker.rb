# frozen_string_literal: true

class PublishEmojiReactionWorker
  include Sidekiq::Worker
  include Redisable
  include RoutingHelper
  include PublishScope

  def perform(status_id, account_id, name)
    @status     = Status.find(status_id)
    @account_id = account_id
    @name       = name

    FeedManager.instance.active_accounts.merge(visibility_scope).find_each do |account|
      redis.publish("timeline:#{account.id}", payload_json) if redis.exists?("subscribed:timeline:#{account.id}") && !account.user.setting_disable_reaction_streaming
    end
  rescue ActiveRecord::RecordNotFound
    true
  end

  def payload_json
    return @payload_json if defined?(@payload_json)

    payload = @status.grouped_emoji_reactions.find { |emoji_reaction| emoji_reaction['name'] == @name }
    payload ||= { name: @name, count: 0, account_ids: [] }

    payload['status_id'] = @status.id.to_s

    @payload_json = Oj.dump(event: :'emoji_reaction', payload: payload)
  end
end
