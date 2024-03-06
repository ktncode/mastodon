# frozen_string_literal: true

module Admin
  class TypesController < BaseController
    before_action :set_account

    def person
      authorize @account, :change_person_type?
      @account.person_type!
      log_action :person_type, @account
      redirect_to admin_account_path(@account.id), notice: I18n.t('admin.accounts.person_type_msg', username: @account.acct)
    end

    def service
      authorize @account, :change_service_type?
      @account.service_type!
      log_action :service_type, @account
      redirect_to admin_account_path(@account.id), notice: I18n.t('admin.accounts.service_type_msg', username: @account.acct)
    end

    def group
      authorize @account, :change_group_type?
      @account.group_type!
      log_action :group_type, @account
      redirect_to admin_account_path(@account.id), notice: I18n.t('admin.accounts.group_type_msg', username: @account.acct)
    end

    private

    def set_account
      @account = Account.find(params[:account_id])
    end
  end
end
