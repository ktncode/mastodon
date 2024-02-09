# frozen_string_literal: true

class InvitePolicy < ApplicationPolicy
  def index?
    staff?
  end

  def create?
    min_required_role?
  end

  def deactivate_all?
    admin?
  end

  def destroy?
    owner? || (Setting.min_invite_role == 'admin' ? admin? : staff?)
  end

  private

  def owner?
    record.user_id == current_user&.id
  end

  def min_required_role?
    current_user&.role?(Setting.min_invite_role) && un_silenced?
  end

  def un_silenced?
    !current_user&.account&.silenced?
  end
end
