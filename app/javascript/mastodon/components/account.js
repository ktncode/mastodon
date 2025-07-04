import React, { Fragment } from 'react';
import ImmutablePropTypes from 'react-immutable-proptypes';
import PropTypes from 'prop-types';
import Avatar from './avatar';
import DisplayName from './display_name';
import Permalink from './permalink';
import IconButton from './icon_button';
import { defineMessages, injectIntl } from 'react-intl';
import ImmutablePureComponent from 'react-immutable-pure-component';
import { me, show_followed_by, follow_button_to_list_adder, disableFollow, disableUnfollow } from '../initial_state';
import RelativeTimestamp from './relative_timestamp';

const messages = defineMessages({
  follow: { id: 'account.follow', defaultMessage: 'Follow' },
  unfollow: { id: 'account.unfollow', defaultMessage: 'Unfollow' },
  unsubscribe: { id: 'account.unsubscribe', defaultMessage: 'Unsubscribe' },
  subscribe: { id: 'account.subscribe', defaultMessage: 'Subscribe' },
  requested: { id: 'account.requested', defaultMessage: 'Awaiting approval' },
  unblock: { id: 'account.unblock', defaultMessage: 'Unblock @{name}' },
  unmute: { id: 'account.unmute', defaultMessage: 'Unmute @{name}' },
  mute_notifications: { id: 'account.mute_notifications', defaultMessage: 'Mute notifications from @{name}' },
  unmute_notifications: { id: 'account.unmute_notifications', defaultMessage: 'Unmute notifications from @{name}' },
});

export default @injectIntl
class Account extends ImmutablePureComponent {

  static propTypes = {
    account: ImmutablePropTypes.map.isRequired,
    onFollow: PropTypes.func.isRequired,
    onSubscribe: PropTypes.func.isRequired,
    onAddToList: PropTypes.func.isRequired,
    onBlock: PropTypes.func.isRequired,
    onMute: PropTypes.func.isRequired,
    onMuteNotifications: PropTypes.func.isRequired,
    intl: PropTypes.object.isRequired,
    hidden: PropTypes.bool,
    actionIcon: PropTypes.string,
    actionTitle: PropTypes.string,
    onActionClick: PropTypes.func,
    append: PropTypes.node,
  };

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

  handleBlock = () => {
    this.props.onBlock(this.props.account);
  }

  handleMute = () => {
    this.props.onMute(this.props.account);
  }

  handleMuteNotifications = () => {
    this.props.onMuteNotifications(this.props.account, true);
  }

  handleUnmuteNotifications = () => {
    this.props.onMuteNotifications(this.props.account, false);
  }

  handleAction = () => {
    this.props.onActionClick(this.props.account);
  }

  render () {
    const { account, intl, hidden, onActionClick, actionIcon, actionTitle, append } = this.props;

    if (!account) {
      return <div />;
    }

    if (hidden) {
      return (
        <Fragment>
          {account.get('display_name')}
          {account.get('username')}
        </Fragment>
      );
    }

    let buttons;

    if (actionIcon) {
      if (onActionClick) {
        buttons = <IconButton icon={actionIcon} title={actionTitle} onClick={this.handleAction} />;
      }
    } else if (account.get('id') !== me && account.get('relationship', null) !== null) {
      const following        = account.getIn(['relationship', 'following']);
      const delivery         = account.getIn(['relationship', 'delivery_following']);
      const followed_by      = account.getIn(['relationship', 'followed_by']) && show_followed_by;
      const subscribing      = account.getIn(['relationship', 'subscribing'], new Map).size > 0;
      const subscribing_home = account.getIn(['relationship', 'subscribing', '-1'], new Map).size > 0;
      const requested        = account.getIn(['relationship', 'requested']);
      const blocking         = account.getIn(['relationship', 'blocking']);
      const muting           = account.getIn(['relationship', 'muting']);

      if (requested) {
        buttons = <IconButton disabled icon='hourglass' title={intl.formatMessage(messages.requested)} />;
      } else if (blocking) {
        buttons = <IconButton active icon='unlock' title={intl.formatMessage(messages.unblock, { name: account.get('username') })} onClick={this.handleBlock} />;
      } else if (muting) {
        let hidingNotificationsButton;
        if (account.getIn(['relationship', 'muting_notifications'])) {
          hidingNotificationsButton = <IconButton active icon='bell' title={intl.formatMessage(messages.unmute_notifications, { name: account.get('username') })} onClick={this.handleUnmuteNotifications} />;
        } else {
          hidingNotificationsButton = <IconButton active icon='bell-slash' title={intl.formatMessage(messages.mute_notifications, { name: account.get('username')  })} onClick={this.handleMuteNotifications} />;
        }
        buttons = (
          <Fragment>
            <IconButton active icon='volume-up' title={intl.formatMessage(messages.unmute, { name: account.get('username') })} onClick={this.handleMute} />
            {hidingNotificationsButton}
          </Fragment>
        );
      } else {
        let following_buttons, subscribing_buttons;
        if (!account.get('moved') || subscribing ) {
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
        if (!account.get('moved') || following) {
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
    }

    let mute_expires_at;
    if (account.get('mute_expires_at')) {
      mute_expires_at =  <div><RelativeTimestamp timestamp={account.get('mute_expires_at')} futureDate /></div>;
    }

    return (
      <div className='account'>
        <div className='account__wrapper'>
          <Permalink key={account.get('id')} className='account__display-name' title={account.get('acct')} href={account.get('url')} to={`${(account.get('group', false)) ? '/timelines/groups/' : '/accounts/'}${account.get('id')}`}>
            <div className='account__avatar-wrapper'><Avatar account={account} size={36} /></div>
            {mute_expires_at}
            <DisplayName account={account} />
          </Permalink>

          <div className='account__relationship'>
            {buttons}
          </div>

          {append}
        </div>
      </div>
    );
  }

}
