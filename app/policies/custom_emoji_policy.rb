# frozen_string_literal: true

class CustomEmojiPolicy < ApplicationPolicy
  def index?
    staff?
  end

  def create?
    admin?
  end

  def update?
    admin?
  end

  def copy?
    admin? && (!record.is_a?(CustomEmoji) || !record.deny_permission?)
  end

  def enable?
    staff?
  end

  def disable?
    staff?
  end

  def destroy?
    admin?
  end

  def fetch?
    admin?
  end
end
