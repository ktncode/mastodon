import React, { Fragment } from 'react';
import ImmutablePropTypes from 'react-immutable-proptypes';
import PropTypes from 'prop-types';
import { defineMessages, injectIntl, FormattedMessage, FormattedDate } from 'react-intl';
import Button from 'mastodon/components/button';
import ImmutablePureComponent from 'react-immutable-pure-component';
import { autoPlayHeader, autoPlayEmoji, me, isStaff, show_followed_by, follow_button_to_list_adder, disablePost, disableBlock, disableDomainBlock, disableFollow, disableUnfollow, hideJoinedDateFromYourself, hideStatusesCountFromYourself, hideFollowingCountFromYourself, hideFollowersCountFromYourself, hideSubscribingCountFromYourself } from 'mastodon/initial_state';
import classNames from 'classnames';
import Icon from 'mastodon/components/icon';
import IconButton from 'mastodon/components/icon_button';
import Avatar from 'mastodon/components/avatar';
import { counterRenderer } from 'mastodon/components/common_counter';
import ShortNumber from 'mastodon/components/short_number';
import Content from 'mastodon/components/content';
import { NavLink } from 'react-router-dom';
import DropdownMenuContainer from 'mastodon/containers/dropdown_menu_container';
import AccountNoteContainer from '../containers/account_note_container';
import age from 's-age';

const messages = defineMessages({
  unfollow: { id: 'account.unfollow', defaultMessage: 'Unfollow' },
  follow: { id: 'account.follow', defaultMessage: 'Follow' },
  unsubscribe: { id: 'account.unsubscribe', defaultMessage: 'Unsubscribe' },
  subscribe: { id: 'account.subscribe', defaultMessage: 'Subscribe' },
  cancel_follow_request: { id: 'account.cancel_follow_request', defaultMessage: 'Cancel follow request' },
  requested: { id: 'account.requested', defaultMessage: 'Awaiting approval. Click to cancel follow request' },
  unblock: { id: 'account.unblock', defaultMessage: 'Unblock @{name}' },
  edit_profile: { id: 'account.edit_profile', defaultMessage: 'Edit profile' },
  linkVerifiedOn: { id: 'account.link_verified_on', defaultMessage: 'Ownership of this link was checked on {date}' },
  account_locked: { id: 'account.locked_info', defaultMessage: 'This account privacy status is set to locked. The owner manually reviews who can follow them.' },
  conversations: { id: 'account.conversations', defaultMessage: 'Show conversations with @{name}' },
  conversations_all: { id: 'account.conversations_all', defaultMessage: 'Show all conversations' },
  mention: { id: 'account.mention', defaultMessage: 'Mention @{name}' },
  direct: { id: 'account.direct', defaultMessage: 'Direct message @{name}' },
  unmute: { id: 'account.unmute', defaultMessage: 'Unmute @{name}' },
  block: { id: 'account.block', defaultMessage: 'Block @{name}' },
  mute: { id: 'account.mute', defaultMessage: 'Mute @{name}' },
  report: { id: 'account.report', defaultMessage: 'Report @{name}' },
  share: { id: 'account.share', defaultMessage: 'Share @{name}\'s profile' },
  media: { id: 'account.media', defaultMessage: 'Media' },
  blockDomain: { id: 'account.block_domain', defaultMessage: 'Block domain {domain}' },
  unblockDomain: { id: 'account.unblock_domain', defaultMessage: 'Unblock domain {domain}' },
  hideReblogs: { id: 'account.hide_reblogs', defaultMessage: 'Hide boosts from @{name}' },
  showReblogs: { id: 'account.show_reblogs', defaultMessage: 'Show boosts from @{name}' },
  enableNotifications: { id: 'account.enable_notifications', defaultMessage: 'Notify me when @{name} posts' },
  disableNotifications: { id: 'account.disable_notifications', defaultMessage: 'Stop notifying me when @{name} posts' },
  pins: { id: 'navigation_bar.pins', defaultMessage: 'Pinned toots' },
  preferences: { id: 'navigation_bar.preferences', defaultMessage: 'Preferences' },
  follow_requests: { id: 'navigation_bar.follow_requests', defaultMessage: 'Follow requests' },
  favourites: { id: 'navigation_bar.favourites', defaultMessage: 'Favourites' },
  lists: { id: 'navigation_bar.lists', defaultMessage: 'Lists' },
  circles: { id: 'navigation_bar.circles', defaultMessage: 'Circles' },
  blocks: { id: 'navigation_bar.blocks', defaultMessage: 'Blocked users' },
  domain_blocks: { id: 'navigation_bar.domain_blocks', defaultMessage: 'Blocked domains' },
  mutes: { id: 'navigation_bar.mutes', defaultMessage: 'Muted users' },
  endorse: { id: 'account.endorse', defaultMessage: 'Feature on profile' },
  unendorse: { id: 'account.unendorse', defaultMessage: 'Don\'t feature on profile' },
  add_or_remove_from_list: { id: 'account.add_or_remove_from_list', defaultMessage: 'Add or Remove from lists' },
  add_or_remove_from_circle: { id: 'account.add_or_remove_from_circle', defaultMessage: 'Add or Remove from circles' },
  admin_account: { id: 'status.admin_account', defaultMessage: 'Open moderation interface for @{name}' },
  secret: { id: 'account.secret', defaultMessage: 'Secret' },
  birth_month_1: { id: 'account.birthday.month.1', defaultMessage: 'January' },
  birth_month_2: { id: 'account.birthday.month.2', defaultMessage: 'February' },
  birth_month_3: { id: 'account.birthday.month.3', defaultMessage: 'March' },
  birth_month_4: { id: 'account.birthday.month.4', defaultMessage: 'April' },
  birth_month_5: { id: 'account.birthday.month.5', defaultMessage: 'May' },
  birth_month_6: { id: 'account.birthday.month.6', defaultMessage: 'June' },
  birth_month_7: { id: 'account.birthday.month.7', defaultMessage: 'July' },
  birth_month_8: { id: 'account.birthday.month.8', defaultMessage: 'August' },
  birth_month_9: { id: 'account.birthday.month.9', defaultMessage: 'September' },
  birth_month_10: { id: 'account.birthday.month.10', defaultMessage: 'October' },
  birth_month_11: { id: 'account.birthday.month.11', defaultMessage: 'November' },
  birth_month_12: { id: 'account.birthday.month.12', defaultMessage: 'December' },
});

const dateFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour12: false,
  hour: '2-digit',
  minute: '2-digit',
};

class Header extends ImmutablePureComponent {

  static contextTypes = {
    router: PropTypes.object,
  };

  static propTypes = {
    account: ImmutablePropTypes.map,
    identity_props: ImmutablePropTypes.list,
    onFollow: PropTypes.func.isRequired,
    onSubscribe: PropTypes.func.isRequired,
    onAddToList: PropTypes.func.isRequired,
    onBlock: PropTypes.func.isRequired,
    onMention: PropTypes.func.isRequired,
    onDirect: PropTypes.func.isRequired,
    onConversations: PropTypes.func.isRequired,
    onReblogToggle: PropTypes.func.isRequired,
    onNotifyToggle: PropTypes.func.isRequired,
    onReport: PropTypes.func.isRequired,
    onMute: PropTypes.func.isRequired,
    onBlockDomain: PropTypes.func.isRequired,
    onUnblockDomain: PropTypes.func.isRequired,
    onEndorseToggle: PropTypes.func.isRequired,
    onAddToList: PropTypes.func.isRequired,
    onEditAccountNote: PropTypes.func.isRequired,
    intl: PropTypes.object.isRequired,
    domain: PropTypes.string.isRequired,
    hideProfile: PropTypes.bool.isRequired,
  };

  componentDidMount () {
    this._updateEmojiLinks();
  }

  componentDidUpdate () {
    this._updateEmojiLinks();
  }

  _updateEmojiLinks () {
    const node = this.node;
    const node2 = this.node2;

    if (node) {
      const emojis = node.querySelectorAll('.custom-emoji');

      for (var i = 0; i < emojis.length; i++) {
        let emoji = emojis[i];
        emoji.addEventListener('click', this.handleEmojiClick, false);
        emoji.style.cursor = 'pointer';
      }
    }

    if (node2) {
      const emojis = node2.querySelectorAll('.custom-emoji');

      for (var i = 0; i < emojis.length; i++) {
        let emoji = emojis[i];
        emoji.addEventListener('click', this.handleEmojiClick, false);
        emoji.style.cursor = 'pointer';
      }
    }

  }

  handleEmojiClick = e => {
    const shortcode = e.target.dataset.shortcode;
    const domain = e.target.dataset.domain;

    if (this.context.router) {
      e.preventDefault();
      e.stopPropagation();
      this.context.router.history.push(`/emoji_detail/${shortcode}${domain ? `@${domain}` : ''}`);
    }
  }

  openEditProfile = () => {
    window.open('/settings/profile', '_blank');
  }

  isStatusesPageActive = (match, location) => {
    if (!match) {
      return false;
    }

    return !location.pathname.match(/\/(followers|following)\/?$/);
  }

  handleMouseEnter = ({ currentTarget }) => {
    if (autoPlayEmoji) {
      return;
    }

    const emojis = currentTarget.querySelectorAll('.custom-emoji');

    for (var i = 0; i < emojis.length; i++) {
      let emoji = emojis[i];
      emoji.src = emoji.getAttribute('data-original');
    }
  }

  handleMouseLeave = ({ currentTarget }) => {
    if (autoPlayEmoji) {
      return;
    }

    const emojis = currentTarget.querySelectorAll('.custom-emoji');

    for (var i = 0; i < emojis.length; i++) {
      let emoji = emojis[i];
      emoji.src = emoji.getAttribute('data-static');
    }
  }

  handleFollow = (e) => {
    if ((e && e.shiftKey) ^ !follow_button_to_list_adder) {
      this.props.onFollow(this.props.account);
    } else {
      this.props.onAddToList(this.props.account);
    }
  }

  handleSubscribe = (e) => {
    if ((e && e.shiftKey) ^ !follow_button_to_list_adder) {
      this.props.onSubscribe(this.props.account);
    } else {
      this.props.onAddToList(this.props.account);
    }
  }

  setRef = (c) => {
    this.node = c;
  }

  setRef2 = (c) => {
    this.node2 = c;
  }

  render () {
    const { account, intl, domain, identity_proofs, hideProfile } = this.props;

    if (!account) {
      return null;
    }

    const suspended = account.get('suspended');

    let info        = [];
    let actionBtn   = '';
    let bellBtn     = '';
    let lockedIcon  = '';
    let menu        = [];
    let header      = '';

    if (me !== account.get('id') && account.getIn(['relationship', 'followed_by'])) {
      info.push(<span key='followed_by' className='relationship-tag'><FormattedMessage id='account.follows_you' defaultMessage='Follows you' /></span>);
    } else if (me !== account.get('id') && account.getIn(['relationship', 'blocking'])) {
      info.push(<span key='blocked' className='relationship-tag'><FormattedMessage id='account.blocked' defaultMessage='Blocked' /></span>);
    }

    if (me !== account.get('id') && account.getIn(['relationship', 'muting'])) {
      info.push(<span key='muted' className='relationship-tag'><FormattedMessage id='account.muted' defaultMessage='Muted' /></span>);
    } else if (me !== account.get('id') && account.getIn(['relationship', 'domain_blocking'])) {
      info.push(<span key='domain_blocked' className='relationship-tag'><FormattedMessage id='account.domain_blocked' defaultMessage='Domain blocked' /></span>);
    }

    if (account.getIn(['relationship', 'requested']) || account.getIn(['relationship', 'following'])) {
      bellBtn = <IconButton icon='bell-o' size={24} active={account.getIn(['relationship', 'notifying'])} title={intl.formatMessage(account.getIn(['relationship', 'notifying']) ? messages.disableNotifications : messages.enableNotifications, { name: account.get('username') })} onClick={this.props.onNotifyToggle} />;
    }

    if (me !== account.get('id')) {
      if (suspended) {
        if (!account.get('relationship')) { // Wait until the relationship is loaded
          actionBtn = '';
        } else if (account.getIn(['relationship', 'blocking'])) {
          actionBtn = <Button className='logo-button' text={intl.formatMessage(messages.unblock, { name: account.get('username') })} onClick={this.props.onBlock} />;
        } else if (!disableBlock) {
          actionBtn = <Button className='logo-button' text={intl.formatMessage(messages.block, { name: account.get('username') })} onClick={this.props.onBlock} />;
        }
      } else {
        if (!account.get('relationship')) { // Wait until the relationship is loaded
          actionBtn = '';
        } else if (account.getIn(['relationship', 'requested'])) {
          actionBtn = <Button className={classNames('logo-button', { 'button--with-bell': bellBtn !== '' })} text={intl.formatMessage(messages.cancel_follow_request)} title={intl.formatMessage(messages.requested)} onClick={this.props.onFollow} />;
        } else if (!account.getIn(['relationship', 'blocking'])) {
          if (account.getIn(['relationship', 'following'])) {
            actionBtn = <Button disabled={disableUnfollow || account.getIn(['relationship', 'blocked_by'])} className={classNames('logo-button', { 'button--destructive': !disableUnfollow, 'button--with-bell': bellBtn !== '' })} text={intl.formatMessage(messages.unfollow)} onClick={this.props.onFollow} />;
          } else {
            actionBtn = <Button disabled={disableFollow || account.getIn(['relationship', 'blocked_by'])} className={classNames('logo-button', { 'button--with-bell': bellBtn !== '' })} text={intl.formatMessage(messages.follow)} onClick={this.props.onFollow} />;
          }
        } else if (account.getIn(['relationship', 'blocking'])) {
          actionBtn = <Button className='logo-button' text={intl.formatMessage(messages.unblock, { name: account.get('username') })} onClick={this.props.onBlock} />;
        }
      }
    } else {
      actionBtn = <Button className='logo-button' text={intl.formatMessage(messages.edit_profile)} onClick={this.openEditProfile} />;
    }

    if (account.get('moved') && !account.getIn(['relationship', 'following'])) {
      actionBtn = '';
    }

    if (account.get('locked')) {
      lockedIcon = <Icon id='lock' title={intl.formatMessage(messages.account_locked)} />;
    }

    if (account.get('id') !== me) {
      if (!disablePost) {
        menu.push({ text: intl.formatMessage(messages.mention, { name: account.get('username') }), action: this.props.onMention });
        menu.push({ text: intl.formatMessage(messages.direct, { name: account.get('username') }), action: this.props.onDirect });
        menu.push(null);
      }

      menu.push({ text: intl.formatMessage(messages.conversations, { name: account.get('username') }), action: this.props.onConversations });
    } else {
      menu.push({ text: intl.formatMessage(messages.conversations_all), action: this.props.onConversations });
    }
    menu.push(null);

    if ('share' in navigator) {
      menu.push({ text: intl.formatMessage(messages.share, { name: account.get('username') }), action: this.handleShare });
      menu.push(null);
    }

    if (account.get('id') === me) {
      menu.push({ text: intl.formatMessage(messages.edit_profile), href: '/settings/profile' });
      menu.push({ text: intl.formatMessage(messages.preferences), href: '/settings/preferences' });
      menu.push({ text: intl.formatMessage(messages.pins), to: '/pinned' });
      menu.push(null);
      menu.push({ text: intl.formatMessage(messages.follow_requests), to: '/follow_requests' });
      menu.push({ text: intl.formatMessage(messages.favourites), to: '/favourites' });
      menu.push({ text: intl.formatMessage(messages.lists), to: '/lists' });
      menu.push({ text: intl.formatMessage(messages.circles), to: '/circles' });
      menu.push(null);
      menu.push({ text: intl.formatMessage(messages.mutes), to: '/mutes' });
      menu.push({ text: intl.formatMessage(messages.blocks), to: '/blocks' });
      menu.push({ text: intl.formatMessage(messages.domain_blocks), to: '/domain_blocks' });
    } else {
      if (account.getIn(['relationship', 'following'])) {
        if (!account.getIn(['relationship', 'muting'])) {
          if (account.getIn(['relationship', 'showing_reblogs'])) {
            menu.push({ text: intl.formatMessage(messages.hideReblogs, { name: account.get('username') }), action: this.props.onReblogToggle });
          } else {
            menu.push({ text: intl.formatMessage(messages.showReblogs, { name: account.get('username') }), action: this.props.onReblogToggle });
          }
        }

        menu.push({ text: intl.formatMessage(account.getIn(['relationship', 'endorsed']) ? messages.unendorse : messages.endorse), action: this.props.onEndorseToggle });
        menu.push(null);
      }
      menu.push({ text: intl.formatMessage(messages.add_or_remove_from_list), action: this.props.onAddToList });
      menu.push(null);

      if (account.getIn(['relationship', 'followed_by'])) {
        menu.push({ text: intl.formatMessage(messages.add_or_remove_from_circle), action: this.props.onAddToCircle });
        menu.push(null);
      }

      if (account.getIn(['relationship', 'muting'])) {
        menu.push({ text: intl.formatMessage(messages.unmute, { name: account.get('username') }), action: this.props.onMute });
      } else {
        menu.push({ text: intl.formatMessage(messages.mute, { name: account.get('username') }), action: this.props.onMute });
      }

      if (account.getIn(['relationship', 'blocking'])) {
        menu.push({ text: intl.formatMessage(messages.unblock, { name: account.get('username') }), action: this.props.onBlock });
      } else if (!disableBlock) {
        menu.push({ text: intl.formatMessage(messages.block, { name: account.get('username') }), action: this.props.onBlock });
      }

      menu.push({ text: intl.formatMessage(messages.report, { name: account.get('username') }), action: this.props.onReport });
    }

    if (account.get('acct') !== account.get('username')) {
      const domain = account.get('acct').split('@')[1];

      menu.push(null);

      if (account.getIn(['relationship', 'domain_blocking'])) {
        menu.push(null);
        menu.push({ text: intl.formatMessage(messages.unblockDomain, { domain }), action: this.props.onUnblockDomain });
      } else if (!disableDomainBlock) {
        menu.push(null);
        menu.push({ text: intl.formatMessage(messages.blockDomain, { domain }), action: this.props.onBlockDomain });
      }
    }

    if (account.get('id') !== me && isStaff) {
      menu.push(null);
      menu.push({ text: intl.formatMessage(messages.admin_account, { name: account.get('username') }), href: `/admin/accounts/${account.get('id')}` });
    }

    const contentHtml      = { __html: account.get('note_emojified') };
    const displayNameHtml  = { __html: account.get('display_name_html') };
    const fields           = account.get('fields');
    const acct             = account.get('acct').indexOf('@') === -1 && domain ? `${account.get('acct')}@${domain}` : account.get('acct');
    const followed_message = account.get('followed_message_emojified');

    let badge;

    if (account.get('bot')) {
      badge = (<div className='account-role bot'><FormattedMessage id='account.badges.bot' defaultMessage='Bot' /></div>);
    } else if (account.get('group')) {
      badge = (<div className='account-role group'><FormattedMessage id='account.badges.group' defaultMessage='Group' /></div>);
    } else {
      badge = null;
    }

    const following        = account.getIn(['relationship', 'following']);
    const delivery         = account.getIn(['relationship', 'delivery_following']);
    const followed_by      = account.getIn(['relationship', 'followed_by']) && show_followed_by;
    const subscribing      = account.getIn(['relationship', 'subscribing'], new Map).size > 0;
    const subscribing_home = account.getIn(['relationship', 'subscribing', '-1'], new Map).size > 0;
    const blockd_by        = account.getIn(['relationship', 'blocked_by']);
    let buttons;

    if(me !== account.get('id') && !blockd_by) {
      let following_buttons, subscribing_buttons;
      if(!account.get('moved') || subscribing) {
        subscribing_buttons = (
          <IconButton
            icon='rss-square'
            title={intl.formatMessage(subscribing ? messages.unsubscribe : messages.subscribe)}
            onClick={this.handleSubscribe}
            active={subscribing}
            no_delivery={subscribing && !subscribing_home}
          />
        );
      }
      if(!account.get('moved') || following) {
        following_buttons = (
          <IconButton
            disabled={following ? disableUnfollow : disableFollow}
            icon={following ? 'user-times' : 'user-plus'}
            title={intl.formatMessage(following ? messages.unfollow : messages.follow)}
            onClick={this.handleFollow}
            active={following}
            passive={followed_by}
            no_delivery={following && !delivery}
          />
        );
      }
      buttons = <Fragment>{subscribing_buttons}{following_buttons}</Fragment>;
    }

    const hide_statuses_count = account.get('id') === me && hideStatusesCountFromYourself || account.getIn(['other_settings', 'hide_statuses_count'], false);
    const hide_following_count = account.get('id') === me && hideFollowingCountFromYourself || account.getIn(['other_settings', 'hide_following_count'], false);
    const hide_followers_count = account.get('id') === me && hideFollowersCountFromYourself || account.getIn(['other_settings', 'hide_followers_count'], false);
    const hide_subscribing_count = account.get('id') === me && hideSubscribingCountFromYourself;

    const location = account.getIn(['other_settings', 'location']);
    const joined = account.get('created_at');

    const birthday = (() => {
      const birth_year  = account.getIn(['other_settings', 'birth_year'], null);
      const birth_month = account.getIn(['other_settings', 'birth_month'], null);
      const birth_day   = account.getIn(['other_settings', 'birth_day'], null);

      const birth_month_name = birth_month >= 1 && birth_month <= 12 ? intl.formatMessage(messages[`birth_month_${birth_month}`]) : null;

      if (birth_year && birth_month && birth_day) {
        const date = new Date(birth_year, birth_month - 1, birth_day);
        return <Fragment><FormattedDate value={date} hour12={false} year='numeric' month='short' day='2-digit' />(<FormattedMessage id='account.age' defaultMessage='{age} years old}' values={{ age: age(date) }} />)</Fragment>;
      } else if (birth_month && birth_day) {
        return <FormattedMessage id='account.birthday.month_day' defaultMessage='{month_name} {day}' values={{ month: birth_month, day: birth_day, month_name: birth_month_name }} />;
      } else if (birth_year && birth_month) {
        return <FormattedMessage id='account.birthday.year_month' defaultMessage='{month_name}, {year}' values={{ year: birth_year, month: birth_month, month_name: birth_month_name }} />;
      } else if (birth_year) {
        return <FormattedMessage id='account.birthday.year' defaultMessage='{year}' values={{ year: birth_year }} />;
      } else if (birth_month) {
        return <FormattedMessage id='account.birthday.month' defaultMessage='{month_name}' values={{ month: birth_month, day: birth_day, month_name: birth_month_name }} />;
      } else if (birth_day) {
        return null;
      } else {
        const date = account.getIn(['other_settings', 'birthday'], null);
        if (date) {
          return <Fragment><FormattedDate value={date} hour12={false} year='numeric' month='short' day='2-digit' />(<FormattedMessage id='account.age' defaultMessage='{age} years old}' values={{ age: age(date) }} />)</Fragment>;
        } else {
          return null;
        }
      }
    })();

    if (account.get('header_full')) {
      if (autoPlayHeader) {
        header = account.get('header_full');
      } else {
        header = account.get('header_full_static');
      }
    } else {
      if (autoPlayHeader) {
        header = account.get('header');
      } else {
        header = account.get('header_static');
      }
    }

    return (
      <div className={classNames('account__header', { inactive: !!account.get('moved') })} onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
        <div className='account__header__image'>
          <div className='account__header__info'>
            {!suspended && info}
          </div>

          <img src={header} alt='' className='parallax' />
        </div>

        <div className='account__header__bar'>
          <div className='account__header__tabs'>
            <a className='avatar' href={account.get('url')} rel='noopener noreferrer' target='_blank'>
              <Avatar account={account} size={90} full />
            </a>

            <div className='spacer' />

            <div className='account__header__tabs__buttons'>
              {actionBtn}
              {!suspended && (<>
                {bellBtn}

                <DropdownMenuContainer items={menu} icon='ellipsis-v' size={24} direction='right' />
              </>)}
            </div>
          </div>

          <div className='account__header__tabs__name'>
            <h1 ref={this.setRef}>
              <span dangerouslySetInnerHTML={displayNameHtml} /> {badge}
              <small>@{acct} {lockedIcon}</small>
            </h1>
            <div className='account__header__tabs__name__relationship account__relationship'>
              {buttons}
            </div>
          </div>

          <div className='account__header__extra'>
            {!hideProfile && (
              <div className='account__header__bio'>
                {(following || account.get('id') === me) && account.get('followed_message') && <div className='account__header__followed_message translate'>
                  <label className='account__header__followed_message_header'><FormattedMessage id='account.followed_message_header' defaultMessage='Message to followers' /></label>
                  <Content contentHtml={{ __html: followed_message }} />
                </div>}

                {(fields.size > 0 || identity_proofs.size > 0) && (
                  <div className='account__header__fields' ref={this.setRef2}>
                    {identity_proofs.map((proof, i) => (
                      <dl key={i}>
                        <dt dangerouslySetInnerHTML={{ __html: proof.get('provider') }} />

                        <dd className='verified'>
                          <a href={proof.get('proof_url')} target='_blank' rel='noopener noreferrer'><span title={intl.formatMessage(messages.linkVerifiedOn, { date: intl.formatDate(proof.get('updated_at'), dateFormatOptions) })}>
                            <Icon id='check' className='verified__mark' />
                          </span></a>
                          <a href={proof.get('profile_url')} target='_blank' rel='noopener noreferrer'><span dangerouslySetInnerHTML={{ __html: ' '+proof.get('provider_username') }} /></a>
                        </dd>
                      </dl>
                    ))}
                    {fields.map((pair, i) => (
                      <dl key={i}>
                        <dt dangerouslySetInnerHTML={{ __html: pair.get('name_emojified') }} title={pair.get('name')} className='translate' />

                        <dd className={`${pair.get('verified_at') ? 'verified' : ''} translate`} title={pair.get('value_plain')}>
                          {pair.get('verified_at') && <span title={intl.formatMessage(messages.linkVerifiedOn, { date: intl.formatDate(pair.get('verified_at'), dateFormatOptions) })}><Icon id='check' className='verified__mark' /></span>} <Content contentHtml={{ __html: pair.get('value_emojified')}} />
                        </dd>
                      </dl>
                    ))}
                  </div>
                )}

                {account.get('id') !== me && !suspended && <AccountNoteContainer account={account} />}

                {account.get('note').length > 0 && account.get('note') !== '<p></p>' && <div className='account__header__content translate'><Content contentHtml={contentHtml} /></div>}

                <div className='account__header__personal--wrapper'>
                  <table className='account__header__personal'>
                    <tbody>
                      {location && <tr>
                        <th><Icon id='map-marker' fixedWidth aria-hidden='true' /> <FormattedMessage id='account.location' defaultMessage='Location' /></th>
                        <td>{location}</td>
                      </tr>}
                      {birthday && <tr>
                        <th><Icon id='birthday-cake' fixedWidth aria-hidden='true' /> <FormattedMessage id='account.birthday' defaultMessage='Birthday' /></th>
                        <td>{birthday}</td>
                      </tr>}
                      {!(hideJoinedDateFromYourself && account.get('id') === me) && <tr>
                        <th><Icon id='calendar' fixedWidth aria-hidden='true' /> <FormattedMessage id='account.joined' defaultMessage='Joined' /></th>
                        <td><FormattedDate value={joined} hour12={false} year='numeric' month='short' day='2-digit' /></td>
                      </tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!hideProfile && !suspended && (
              <div className='account__header__extra__links'>
                <NavLink isActive={this.isStatusesPageActive} activeClassName='active' to={`/accounts/${account.get('id')}/posts`} title={hide_statuses_count ? intl.formatMessage(messages.secret) : intl.formatNumber(account.get('statuses_count'))}>
                  <ShortNumber
                    hide={hide_statuses_count}
                    value={account.get('statuses_count')}
                    renderer={counterRenderer('statuses')}
                  />
                </NavLink>

                <NavLink exact activeClassName='active' to={`/accounts/${account.get('id')}/following`} title={hide_following_count ? intl.formatMessage(messages.secret) : intl.formatNumber(account.get('following_count'))}>
                  <ShortNumber
                    hide={hide_following_count}
                    value={account.get('following_count')}
                    renderer={counterRenderer('following')}
                  />
                </NavLink>

                <NavLink exact activeClassName='active' to={`/accounts/${account.get('id')}/followers`} title={hide_followers_count ? intl.formatMessage(messages.secret) : intl.formatNumber(account.get('followers_count'))}>
                  <ShortNumber
                    hide={hide_followers_count}
                    value={account.get('followers_count')}
                    renderer={counterRenderer('followers')}
                  />
                </NavLink>

                { (me === account.get('id')) && (
                  <NavLink exact activeClassName='active' to={`/accounts/${account.get('id')}/subscribing`} title={intl.formatNumber(account.get('subscribing_count'))}>
                    <ShortNumber
                      hide={hide_subscribing_count}
                      value={account.get('subscribing_count')}
                      renderer={counterRenderer('subscribers')}
                    />
                  </NavLink>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

}

export default injectIntl(Header);
