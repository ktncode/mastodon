# frozen_string_literal: true

module AccountsHelper
  def display_name(account, **options)
    if options[:custom_emojify]
      Formatter.instance.format_display_name(account, **options)
    else
      account.display_name.presence || account.username
    end
  end

  def acct(account)
    if account.local?
      "@#{account.acct}@#{site_hostname}"
    else
      "@#{account.pretty_acct}"
    end
  end

  def account_action_button(account)
    if user_signed_in?
      if account.id == current_user.account_id
        link_to settings_profile_url, class: 'button logo-button' do
          safe_join([svg_logo, t('settings.edit_profile')])
        end
      elsif current_account.following?(account) || current_account.requested?(account)
        link_to account_unfollow_path(account), class: 'button logo-button button--destructive', data: { method: :post } do
          safe_join([svg_logo, t('accounts.unfollow')])
        end
      elsif !(account.memorial? || account.moved?)
        link_to account_follow_path(account), class: "button logo-button#{account.blocking?(current_account) ? ' disabled' : ''}", data: { method: :post } do
          safe_join([svg_logo, t('accounts.follow')])
        end
      end
    elsif !(account.memorial? || account.moved?)
      link_to account_remote_follow_path(account), class: 'button logo-button modal-button', target: '_new' do
        safe_join([svg_logo, t('accounts.follow')])
      end
    end
  end

  def minimal_account_action_button(account)
    if user_signed_in?
      return if account.id == current_user.account_id

      if current_account.following?(account) || current_account.requested?(account)
        link_to account_unfollow_path(account), class: 'icon-button active', data: { method: :post }, title: t('accounts.unfollow') do
          fa_icon('user-times fw')
        end
      elsif !(account.memorial? || account.moved?)
        link_to account_follow_path(account), class: "icon-button#{account.blocking?(current_account) ? ' disabled' : ''}", data: { method: :post }, title: t('accounts.follow') do
          fa_icon('user-plus fw')
        end
      end
    elsif !(account.memorial? || account.moved?)
      link_to account_remote_follow_path(account), class: 'icon-button modal-button', target: '_new', title: t('accounts.follow') do
        fa_icon('user-plus fw')
      end
    end
  end

  def account_badge(account, all: false)
    if account.bot?
      content_tag(:div, content_tag(:div, t('accounts.roles.bot'), class: 'account-role bot'), class: 'roles')
    elsif account.group?
      content_tag(:div, content_tag(:div, t('accounts.roles.group'), class: 'account-role group'), class: 'roles')
    elsif (Setting.show_staff_badge && account.user_staff?) || all
      content_tag(:div, class: 'roles') do
        if all && !account.user_staff?
          content_tag(:div, t('admin.accounts.roles.user'), class: 'account-role')
        elsif account.user_admin?
          content_tag(:div, t('accounts.roles.admin'), class: 'account-role admin')
        elsif Setting.show_moderator_badge && account.user_moderator?
          content_tag(:div, t('accounts.roles.moderator'), class: 'account-role moderator')
        end
      end
    end
  end

  def account_description(account)
    prepend_str = [
      account.hide_statuses_count? ? nil : [
        number_to_human(account.public_statuses_count, precision: 3, strip_insignificant_zeros: true),
        I18n.t('accounts.posts', count: account.public_statuses_count),
      ].join(' '),

      account.hide_following_count? ? nil : [
        number_to_human(account.public_following_count, precision: 3, strip_insignificant_zeros: true),
        I18n.t('accounts.following', count: account.public_following_count),
      ].join(' '),

      account.hide_followers_count? ? nil : [
        number_to_human(account.public_followers_count, precision: 3, strip_insignificant_zeros: true),
        I18n.t('accounts.followers', count: account.public_followers_count),
      ].join(' '),
    ].compact.join(', ')

    [prepend_str, account.note].join(' Â· ')
  end

  def account_cat_params(account, **options)
    result = options || {}
    result.merge!({ 'data-acct': account.acct })

    return result unless !current_user&.setting_disable_joke_appearance && account.other_settings['is_cat']

    @cat_inline_styles ||= {}
    @cat_inline_styles[account.acct] = account.cat_ears_color if account.cat_ears_color

    result.merge!({ class: [options[:class], 'cat'].compact.join(' ') })
  end

  def account_cat_styles
    return if @cat_inline_styles.nil?

    @cat_inline_styles.map do |acct, color|
      ".cat[data-acct=\"#{h(acct)}\"] { --cat-ears-color: #{h(color)}; }"
    end.join("\n")
  end

  def account_theme_valiables(account)
    user = account&.user&.setting_theme_public && account&.user || current_user

    css = []

    css << <<-EOS
    :root {
      --content-font-size: #{h(user&.setting_content_font_size || Setting.default_settings['content_font_size'])}px;
      --info-font-size: #{h(user&.setting_info_font_size || Setting.default_settings['info_font_size'])}px;
      --content-emoji-reaction-size: #{h(user&.setting_content_emoji_reaction_size || Setting.default_settings['content_emoji_reaction_size'])}px;
      --emoji-scale: #{h(user&.setting_emoji_scale || Setting.default_settings['emoji_scale'])};
    }
    EOS

    css << <<-EOS if user.nil? || user&.setting_enable_wide_emoji
    img.emojione:not(.reaction) {
      width: unset !important;
      max-width: min(100%, 10em);
    }
    EOS

    css << <<-EOS if user.nil? || user&.setting_enable_wide_emoji_reaction
    span.reactions-bar__item__emoji {
      width: unset !important;
    }
    span.reactions-bar__item__emoji img.emojione.custom-emoji {
      width: unset !important;
      max-width: 8em;
    }
    EOS

    css.join("\n")
  end

  def svg_logo
    content_tag(:svg, tag(:use, 'xlink:href' => '#mastodon-svg-logo'), 'viewBox' => '0 0 216.4144 232.00976')
  end

  def svg_logo_full
    content_tag(:svg, tag(:use, 'xlink:href' => '#mastodon-svg-logo-full'), 'viewBox' => '0 0 713.35878 175.8678')
  end
end
