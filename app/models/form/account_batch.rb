# frozen_string_literal: true

class Form::AccountBatch
  include ActiveModel::Model
  include Authorization
  include Payloadable

  attr_accessor :account_ids, :action, :current_account

  def save
    case action
    when 'follow'
      follow!
    when 'unfollow'
      unfollow!
    when 'remove_from_followers'
      remove_from_followers!
    when 'remove_domains_from_followers'
      remove_domains_from_followers!
    when 'approve'
      approve!
    when 'reject'
      reject!
    when 'suppress_follow_recommendation'
      suppress_follow_recommendation!
    when 'unsuppress_follow_recommendation'
      unsuppress_follow_recommendation!
    end
  end

  private

  def follow!
    error = nil

    accounts.each do |target_account|
      FollowService.new.call(current_account, target_account)
    rescue Mastodon::NotPermittedError, ActiveRecord::RecordNotFound => e
      error ||= e
    end

    raise error if error.present?
  end

  def unfollow!
    accounts.find_each do |target_account|
      UnfollowService.new.call(current_account, target_account)
    end
  end

  def remove_from_followers!
    RemoveFromFollowersService.new.call(current_account, account_ids)
  end

  def remove_domains_from_followers!
    RemoveDomainsFromFollowersService.new.call(current_account, account_domains)
  end

  def account_domains
    accounts.group(:domain).pluck(:domain).compact
  end

  def accounts
    Account.where(id: account_ids)
  end

  def approve!
    users = accounts.includes(:user).map(&:user)

    users.each { |user| authorize(user, :approve?) }
         .each(&:approve!)
  end

  def reject!
    records = accounts.includes(:user)

    records.each { |account| authorize(account.user, :reject?) }
           .each { |account| DeleteAccountService.new.call(account, reserve_email: false, reserve_username: false) }
  end

  def suppress_follow_recommendation!
    authorize(:follow_recommendation, :suppress?)

    accounts.each do |account|
      FollowRecommendationSuppression.create(account: account)
    end
  end

  def unsuppress_follow_recommendation!
    authorize(:follow_recommendation, :unsuppress?)

    FollowRecommendationSuppression.where(account_id: account_ids).destroy_all
  end
end
