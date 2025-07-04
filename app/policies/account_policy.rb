# frozen_string_literal: true

class AccountPolicy < ApplicationPolicy
  def index?
    staff?
  end

  def show?
    staff?
  end

  def warn?
    staff? && !record.user&.staff?
  end

  def suspend?
    staff? && !record.user&.staff? && !record.instance_actor?
  end

  def destroy?
    record.suspended_temporarily? && admin?
  end

  def unsuspend?
    staff? && record.suspension_origin_local?
  end

  def sensitive?
    staff? && !record.user&.staff?
  end

  def unsensitive?
    staff?
  end

  def silence?
    staff? && !record.user&.staff?
  end

  def unsilence?
    staff?
  end

  def redownload?
    admin?
  end

  def remove_avatar?
    staff?
  end

  def remove_header?
    staff?
  end

  def subscribe?
    admin?
  end

  def unsubscribe?
    admin?
  end

  def change_default_priority?
    admin? && !record.default_priority?
  end

  def change_high_priority?
    admin? && !record.high_priority?
  end

  def change_low_priority?
    admin? && !record.low_priority?
  end

  def change_person_type?
    admin? && !record.person_type?
  end

  def change_service_type?
    admin? && !record.service_type?
  end

  def change_group_type?
    admin? && !record.group_type?
  end

  def memorialize?
    admin? && !record.user&.admin? && !record.instance_actor?
  end
end
