# frozen_string_literal: true

module PublishScope
  extend ActiveSupport::Concern

  included do
    def visibility_scope
      case @status.visibility
      when 'public', 'unlisted'
        local_scope
      when 'private'
        Account.where(id: Account
          .union(local_followers_scope)
          .union(local_mentions_scope)
          .union(local_sender_scope)
        )
      when 'limited', 'direct'
        Account.where(id: Account
          .union(local_mentions_scope)
          .union(local_sender_scope)
        )
      else
        Account.none
      end.select(:id)
    end
  
    def local_scope
      Account.local
    end

    def local_followers_scope
      @status.account.delivery_followers.local.select(:id)
    end
  
    def local_mentions_scope
      Account.local.where(id: @status.mentions.select(:account_id)).select(:id)
    end
  
    def local_sender_scope
      Account.local.where(id: @account_id).select(:id)
    end
  end
end
