# frozen_string_literal: true

class Api::V1::AccountsController < Api::BaseController
  before_action -> { authorize_if_got_token! :read, :'read:accounts' }, except: [:create, :follow, :unfollow, :remove_from_followers, :subscribe, :unsubscribe, :block, :unblock, :mute, :unmute]
  before_action -> { doorkeeper_authorize! :follow, :write, :'write:follows' }, only: [:follow, :unfollow, :remove_from_followers, :subscribe, :unsubscribe]
  before_action -> { doorkeeper_authorize! :follow, :write, :'write:mutes' }, only: [:mute, :unmute]
  before_action -> { doorkeeper_authorize! :follow, :write, :'write:blocks' }, only: [:block, :unblock]
  before_action -> { doorkeeper_authorize! :write, :'write:accounts' }, only: [:create]

  before_action :require_user!, except: [:index, :show, :create]
  before_action :set_account, except: [:index, :create]
  before_action :set_accounts, only: [:index]
  before_action :check_enabled_registrations, only: [:create]

  skip_before_action :require_authenticated_user!, only: :create

  override_rate_limit_headers :follow, family: :follows

  def index
    render json: @accounts, each_serializer: REST::AccountSerializer
  end

  def show
    render json: @account, serializer: REST::AccountSerializer
  end

  def create
    token    = AppSignUpService.new.call(doorkeeper_token.application, request.remote_ip, account_params)
    response = Doorkeeper::OAuth::TokenResponse.new(token)

    headers.merge!(response.headers)

    self.response_body = Oj.dump(response.body)
    self.status        = response.status
  rescue ActiveRecord::RecordInvalid => e
    render json: ValidationErrorFormatter.new(e, :'account.username' => :username, :'invite_request.text' => :reason).as_json, status: :unprocessable_entity
  end

  def follow
    raise Mastodon::NotPermittedError if current_user.setting_disable_follow && !current_user.account.following?(@account)

    follow  = FollowService.new.call(current_user.account, @account, reblogs: params.key?(:reblogs) ? truthy_param?(:reblogs) : nil, notify: params.key?(:notify) ? truthy_param?(:notify) : nil, delivery: params.key?(:delivery) ? truthy_param?(:delivery) : nil, with_rate_limit: true)
    options = @account.locked? || current_user.account.silenced? ? {} : {
      following_map:          { @account.id => true },
      showing_reblogs_map:    { @account.id => follow.show_reblogs? },
      notifying_map:          { @account.id => follow.notify? },
      delivery_following_map: { @account.id => follow.delivery? },
      requested_map:          { @account.id => false }
    }

    render json: @account, serializer: REST::RelationshipSerializer, relationships: relationships(**options)
  end

  def subscribe
    AccountSubscribeService.new.call(current_user.account, @account, reblogs: truthy_param?(:reblogs), media_only: truthy_param?(:media_only) || false, list_id: params[:list_id])
    render json: @account, serializer: REST::RelationshipSerializer, relationships: relationships
  end

  def block
    raise Mastodon::NotPermittedError if current_user.setting_disable_block

    BlockService.new.call(current_user.account, @account)
    render json: @account, serializer: REST::RelationshipSerializer, relationships: relationships
  end

  def mute
    MuteService.new.call(current_user.account, @account, notifications: truthy_param?(:notifications), duration: (params[:duration]&.to_i || 0))
    render json: @account, serializer: REST::RelationshipSerializer, relationships: relationships
  end

  def unfollow
    raise Mastodon::NotPermittedError if current_user.setting_disable_unfollow && (current_user.account.following?(@account) || !current_user.account.requested?(@account))

    UnfollowService.new.call(current_user.account, @account)
    render json: @account, serializer: REST::RelationshipSerializer, relationships: relationships
  end

  def remove_from_followers
    RemoveFromFollowersService.new.call(current_user.account, @account)
    render json: @account, serializer: REST::RelationshipSerializer, relationships: relationships
  end

  def unsubscribe
    UnsubscribeAccountService.new.call(current_user.account, @account, list_id: params[:list_id])
  end

  def unblock
    UnblockService.new.call(current_user.account, @account)
    render json: @account, serializer: REST::RelationshipSerializer, relationships: relationships
  end

  def unmute
    UnmuteService.new.call(current_user.account, @account)
    render json: @account, serializer: REST::RelationshipSerializer, relationships: relationships
  end

  private

  def set_account
    @account = Account.find(params[:id]).tap do |account|
      account.locked = false if account == current_account && current_user.setting_unlocked_for_official_app && (mastodon_for_ios? || mastodon_for_android?)
    end
  end

  def set_accounts
    @accounts = Account.where(id: account_ids)
  end

  def relationships(**options)
    AccountRelationshipsPresenter.new([@account.id], current_user.account_id, **options)
  end

  def account_ids
    Array(accounts_params[:id]).concat(Array(accounts_params[:ids])).uniq.map(&:to_i)
  end

  def accounts_params
    params.permit(id: [], ids: [])
  end

  def account_params
    params.permit(:username, :email, :password, :agreement, :locale, :reason, :time_zone)
  end

  def check_enabled_registrations
    forbidden if single_user_mode? || !allowed_registrations?
  end

  def allowed_registrations?
    Setting.registrations_mode != 'none'
  end
end
