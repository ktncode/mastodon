# frozen_string_literal: true

class Auth::SessionsController < Devise::SessionsController
  include Devise::Controllers::Rememberable
  include Redisable

  MAX_2FA_ATTEMPTS_PER_HOUR = 10

  layout 'auth'

  skip_before_action :require_no_authentication, only: [:create]
  skip_before_action :require_functional!
  skip_before_action :update_user_sign_in

  include TwoFactorAuthenticationConcern
  include SignInTokenAuthenticationConcern

  before_action :set_instance_presenter, only: [:new]
  before_action :set_body_classes

  def new
    Devise.omniauth_configs.each do |provider, config|
      return redirect_to(omniauth_authorize_path(resource_name, provider)) if config.strategy.redirect_at_sign_in
    end

    super
  end

  def create
    super do |resource|
      # We only need to call this if this hasn't already been
      # called from one of the two-factor or sign-in token
      # authentication methods

      on_authentication_success(resource, :password) unless @on_authentication_success_called
    end
  end

  def destroy
    tmp_stored_location = stored_location_for(:user)
    super
    session.delete(:challenge_passed_at)
    flash.delete(:notice)
    store_location_for(:user, tmp_stored_location) if continue_after?
  end

  def webauthn_options
    user = find_user

    if user&.webauthn_enabled?
      options_for_get = WebAuthn::Credential.options_for_get(allow: user.webauthn_credentials.pluck(:external_id))

      session[:webauthn_challenge] = options_for_get.challenge

      render json: options_for_get, status: :ok
    else
      render json: { error: t('webauthn_credentials.not_enabled') }, status: :unauthorized
    end
  end

  protected

  def find_user
    if session[:attempt_user_id]
      User.find_by(id: session[:attempt_user_id])
    else
      user   = User.authenticate_with_ldap(user_params) if Devise.ldap_authentication
      user ||= User.authenticate_with_pam(user_params) if Devise.pam_authentication
      user ||= User.find_for_authentication(email: user_params[:email])
      user
    end
  end

  def user_params
    params.require(:user).permit(:email, :password, :otp_attempt, :sign_in_token_attempt, credential: {})
  end

  def after_sign_in_path_for(resource)
    last_url = stored_location_for(:user)

    if home_paths(resource).include?(last_url)
      root_path
    else
      last_url || root_path
    end
  end

  def after_sign_out_path_for(_resource_or_scope)
    Devise.omniauth_configs.each_value do |config|
      return root_path if config.strategy.redirect_at_sign_in
    end

    super
  end

  def require_no_authentication
    super

    # Delete flash message that isn't entirely useful and may be confusing in
    # most cases because /web doesn't display/clear flash messages.
    flash.delete(:alert) if flash[:alert] == I18n.t('devise.failure.already_authenticated')
  end

  private

  def set_instance_presenter
    @instance_presenter = InstancePresenter.new
  end

  def set_body_classes
    @body_classes = 'lighter'
  end

  def home_paths(resource)
    paths = [about_path]

    if single_user_mode? && resource.is_a?(User)
      paths << short_account_path(username: resource.account)
    end

    paths
  end

  def continue_after?
    truthy_param?(:continue)
  end

  def restart_session
    clear_attempt_from_session
    redirect_to new_user_session_path, alert: I18n.t('devise.failure.timeout')
  end

  def set_attempt_session(user)
    session[:attempt_user_id]         = user.id
    session[:attempt_user_updated_at] = user.updated_at.to_s
  end

  def clear_attempt_from_session
    session.delete(:attempt_user_id)
    session.delete(:attempt_user_updated_at)
  end

  def clear_2fa_attempt_from_user(user)
    redis.del(second_factor_attempts_key(user))
  end

  def check_second_factor_rate_limits(user)
    attempts, = redis.multi do |multi|
      multi.incr(second_factor_attempts_key(user))
      multi.expire(second_factor_attempts_key(user), 1.hour)
    end

    attempts >= MAX_2FA_ATTEMPTS_PER_HOUR
  end

  def on_authentication_success(user, security_measure)
    @on_authentication_success_called = true

    clear_2fa_attempt_from_user(user)
    clear_attempt_from_session

    user.update_sign_in!(request, new_sign_in: true)
    remember_me(user)
    sign_in(user)
    flash.delete(:notice)

    LoginActivity.create(
      user: user,
      success: true,
      authentication_method: security_measure,
      ip: request.remote_ip,
      user_agent: request.user_agent
    )
  end

  def on_authentication_failure(user, security_measure, failure_reason)
    LoginActivity.create(
      user: user,
      success: false,
      authentication_method: security_measure,
      failure_reason: failure_reason,
      ip: request.remote_ip,
      user_agent: request.user_agent
    )
  end

  def second_factor_attempts_key(user)
    "2fa_auth_attempts:#{user.id}:#{Time.now.utc.hour}"
  end
end
