# frozen_string_literal: true

class ActivityPub::ObjectLinkPresenter < ActiveModelSerializers::Model
  attributes :href, :name
end
