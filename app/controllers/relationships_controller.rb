# frozen_string_literal: true

class RelationshipsController < ApplicationController
  layout 'admin'

  before_action :authenticate_user!
  before_action :set_accounts, only: :show
  before_action :set_relationships, only: :show
  before_action :set_body_classes

  helper_method :following_relationship?, :followed_by_relationship?, :mutual_relationship?

  def show
    @form = Form::AccountBatch.new
  end

  def update
    @form = Form::AccountBatch.new(form_account_batch_params.merge(current_account: current_account, action: action_from_button))
    @form.save
  rescue ActionController::ParameterMissing
    # Do nothing
  rescue Mastodon::NotPermittedError, ActiveRecord::RecordNotFound
    flash[:alert] = I18n.t('relationships.follow_failure') if action_from_button == 'follow'
  ensure
    redirect_to relationships_path(restricted_params)
  end

  private

  def set_accounts
    @accounts = RelationshipFilter.new(current_account, restricted_params).results.page(params[:page]).per(40)
  end

  def set_relationships
    @relationships = AccountRelationshipsPresenter.new(@accounts.pluck(:id), current_user.account_id)
  end

  def form_account_batch_params
    params.require(:form_account_batch).permit(:action, account_ids: [])
  end

  def following_relationship?
    restricted_params[:relationship].blank? || restricted_params[:relationship] == 'following'
  end

  def mutual_relationship?
    restricted_params[:interrelationship] == 'mutual'
  end

  def one_way_relationship?
    restricted_params[:interrelationship] == 'one_way'
  end

  def followed_by_relationship?
    restricted_params[:relationship] == 'followed_by'
  end

  def restricted_params
    filter_params.tap do |p|
      p.merge!({relationship: nil,           interrelationship: 'one_way'}) if current_user&.setting_hide_followers_from_yourself
      p.merge!({relationship: 'followed_by', interrelationship: 'one_way'}) if current_user&.setting_hide_following_from_yourself
    end
  end

  def filter_params
    params.slice(:page, *RelationshipFilter::KEYS).permit(:page, *RelationshipFilter::KEYS)
  end

  def action_from_button
    if params[:follow]
      'follow'
    elsif params[:unfollow]
      'unfollow'
    elsif params[:remove_from_followers]
      'remove_from_followers'
    elsif params[:block_domains] || params[:remove_domains_from_followers]
      'remove_domains_from_followers'
    end
  end

  def set_body_classes
    @body_classes = 'admin'
  end
end
