# frozen_string_literal: true

class RetryFollowRequestWorker
  include Sidekiq::Worker

  sidekiq_options queue: 'pull', retry: false

  def perform(target_account_id)
    target_account = Account.find(target_account_id)
    return unless target_account.activitypub?

    FollowRequest.where(target_account: target_account).find_each do |follow_request|
      reblogs  = follow_request.show_reblogs?
      notify   = follow_request.notify?
      delivery = follow_request.delivery?
      follower = follow_request.account

      begin
        UnfollowService.new.call(follower, target_account, skip_unmerge: true)
        FollowService.new.call(follower, target_account, reblogs: reblogs, notify: notify, delivery: delivery, bypass_limit: true)
      rescue Mastodon::NotPermittedError, ActiveRecord::RecordNotFound, Mastodon::UnexpectedResponseError, HTTP::Error, OpenSSL::SSL::SSLError
        next
      end
    end
  end
end
