# frozen_string_literal: true

class ActivityPub::EmojiReactionsController < ActivityPub::BaseController
  include SignatureVerification
  include Authorization
  include AccountOwnedConcern

  EMOJI_REACTIONS_LIMIT = 60

  before_action :require_signature!, if: :authorized_fetch_mode?
  before_action :set_status
  before_action :set_cache_headers
  before_action :set_emoji_reactions

  def index
    expires_in 0, public: public_fetch_mode?
    render json: emoji_reactions_collection_presenter, serializer: ActivityPub::CollectionSerializer, adapter: ActivityPub::Adapter, content_type: 'application/activity+json', skip_activities: true
  end

  private

  def pundit_user
    signed_request_account
  end

  def set_status
    @status = @account.statuses.find(params[:status_id])
    authorize @status, :show?
  rescue Mastodon::NotPermittedError
    not_found
  end

  def set_emoji_reactions
    @emoji_reactions = @status.emoji_reactions.joins(:account).merge(Account.without_silenced)
    @emoji_reactions = @emoji_reactions.paginate_by_min_id(EMOJI_REACTIONS_LIMIT, params[:min_id])
  end

  def records_continue?
    @emoji_reactions.size == EMOJI_REACTIONS_LIMIT
  end

  def emoji_reactions_collection_presenter
    page = ActivityPub::CollectionPresenter.new(
      id: ActivityPub::TagManager.instance.emoji_reactions_uri_for(@status, page_params),
      type: :unordered,
      part_of: ActivityPub::TagManager.instance.emoji_reactions_uri_for(@status),
      next: next_page,
      items: @emoji_reactions.map { |emoji_reaction| emoji_reaction.uri.blank? ? emoji_reaction : emoji_reaction.uri }
    )

    return page if page_requested?

    ActivityPub::CollectionPresenter.new(
      id: ActivityPub::TagManager.instance.emoji_reactions_uri_for(@status),
      type: :unordered,
      first: page
    )
  end

  def page_requested?
    truthy_param?(:page)
  end

  def next_page
    if records_continue?
      ActivityPub::TagManager.instance.emoji_reactions_uri_for(
        @status,
        page: true,
        min_id: @emoji_reactions&.last&.id,
      )
    end
  end

  def page_params
    params_slice(:min_id).merge(page: true)
  end
end
