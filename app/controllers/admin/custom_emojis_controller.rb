# frozen_string_literal: true

module Admin
  class CustomEmojisController < BaseController
    before_action :set_custom_emoji, only: [:edit, :update]

    def index
      authorize :custom_emoji, :index?

      @custom_emojis = filtered_custom_emojis.eager_load(:local_counterpart).page(params[:page])
      @form          = Form::CustomEmojiBatch.new
    end

    def new
      authorize :custom_emoji, :create?

      @custom_emoji = CustomEmoji.new
    end

    def create
      authorize :custom_emoji, :create?

      @custom_emoji = CustomEmoji.new(resource_params.merge!({ visible_in_picker: false }))

      if @custom_emoji.save
        log_action :create, @custom_emoji

        if params[:upload_once_more]
          redirect_to new_admin_custom_emoji_path(filter_params.merge(resource_params)), notice: I18n.t('admin.custom_emojis.created_msg')
        else
          redirect_to admin_custom_emojis_path(filter_params), notice: I18n.t('admin.custom_emojis.created_msg')
        end
      else
        render :new
      end
    end

    def edit; end

    def update
      return redirect_to admin_custom_emojis_path(filter_params) if params[:go_to_index]

      if @custom_emoji.update(resource_params)
        if params[:update_and_next] && (id = filtered_custom_emojis.where(domain: @custom_emoji.domain..).where('shortcode > ?', @custom_emoji.shortcode).take&.id)
          redirect_to edit_admin_custom_emoji_path(id, filter_params), notice: I18n.t('admin.custom_emojis.updated_msg')
        else
          redirect_to admin_custom_emojis_path(filter_params), notice: I18n.t('admin.custom_emojis.updated_msg')
        end
      else
        render action: :edit
      end
    end
  
    def batch
      @form = Form::CustomEmojiBatch.new(form_custom_emoji_batch_params.merge(current_account: current_account, action: action_from_button))
      @form.save
    rescue ActionController::ParameterMissing
      flash[:alert] = I18n.t('admin.accounts.no_account_selected')
    rescue Mastodon::NotPermittedError
      flash[:alert] = I18n.t('admin.custom_emojis.not_permitted')
    ensure
      redirect_to admin_custom_emojis_path(filter_params)
    end

    private

    def set_custom_emoji
      @custom_emoji = CustomEmoji.find(params[:id])
    end

    def resource_params
      params.require(:custom_emoji).permit(:shortcode, :image, :visible_in_picker, :category_id, :category_name, :keywords, :description, :author, :copy_permission, :license, :usage_info, :sensitive).tap do |p|
        p[:category_id] = CustomEmojiCategory.find_or_create_by!(name: p[:category_name]).id if p[:category_name].present?
      end
    end

    def filtered_custom_emojis
      CustomEmojiFilter.new(filter_params).results
    end

    def filter_params
      params.slice(:page, *CustomEmojiFilter::KEYS).permit(:page, *CustomEmojiFilter::KEYS)
    end

    def action_from_button
      if params[:update]
        'update'
      elsif params[:list]
        'list'
      elsif params[:unlist]
        'unlist'
      elsif params[:enable]
        'enable'
      elsif params[:disable]
        'disable'
      elsif params[:copy]
        'copy'
      elsif params[:delete]
        'delete'
      elsif params[:fetch]
        'fetch'
      end
    end

    def form_custom_emoji_batch_params
      params.require(:form_custom_emoji_batch).permit(:action, :category_id, :category_name, :keyword_action, :keyword_action_value, :description, :author, :copy_permission, :license, :usage_info, :sensitive, custom_emoji_ids: [])
    end
  end
end
