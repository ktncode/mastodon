# frozen_string_literal: true

module Admin
  class PrioritiesController < BaseController
    before_action :set_account

    def default
      authorize @account, :change_default_priority?
      @account.default_priority!
      log_action :default_priority, @account
      redirect_to admin_account_path(@account.id), notice: I18n.t('admin.accounts.default_priority_msg', username: @account.acct)
    end

    def high
      authorize @account, :change_high_priority?
      @account.high_priority!
      log_action :high_priority, @account
      redirect_to admin_account_path(@account.id), notice: I18n.t('admin.accounts.high_priority_msg', username: @account.acct)
    end

    def low
      authorize @account, :change_low_priority?
      @account.low_priority!
      log_action :low_priority, @account
      redirect_to admin_account_path(@account.id), notice: I18n.t('admin.accounts.low_priority_msg', username: @account.acct)
    end

    private

    def set_account
      @account = Account.find(params[:account_id])
    end
  end
end
