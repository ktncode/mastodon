import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import ImmutablePureComponent from 'react-immutable-pure-component';
import ImmutablePropTypes from 'react-immutable-proptypes';
import Avatar from '../../../components/avatar';
import DisplayName from '../../../components/display_name';
import IconButton from '../../../components/icon_button';
import { unfollowAccount, followAccount } from '../../../actions/accounts';
import { me, show_followed_by, followModal, unfollowModal, disableFollow, disableUnfollow } from '../../../initial_state';
import { openModal } from '../../../actions/modal';
import { defineMessages, injectIntl, FormattedMessage } from 'react-intl';

const messages = defineMessages({
  follow: { id: 'account.follow', defaultMessage: 'Follow' },
  unfollow: { id: 'account.unfollow', defaultMessage: 'Unfollow' },
  requested: { id: 'account.requested', defaultMessage: 'Awaiting approval' },
  followConfirm: { id: 'confirmations.follow.confirm', defaultMessage: 'Follow' },
  unfollowConfirm: { id: 'confirmations.unfollow.confirm', defaultMessage: 'Unfollow' },
});

const MapStateToProps = () => ({
});

const mapDispatchToProps = (dispatch, { intl }) => ({
  onFollow (account) {
    if (account.getIn(['relationship', 'following']) || account.getIn(['relationship', 'requested'])) {
      if (unfollowModal) {
        dispatch(openModal('CONFIRM', {
          message: <FormattedMessage id='confirmations.unfollow.message' defaultMessage='Are you sure you want to unfollow {name}?' values={{ name: <strong>@{account.get('acct')}</strong> }} />,
          confirm: intl.formatMessage(messages.unfollowConfirm),
          onConfirm: () => dispatch(unfollowAccount(account.get('id'))),
        }));
      } else {
        dispatch(unfollowAccount(account.get('id')));
      }
    } else {
      if (followModal) {
        dispatch(openModal('CONFIRM', {
          message: <FormattedMessage id='confirmations.follow.message' defaultMessage='Are you sure you want to follow {name}?' values={{ name: <strong>@{account.get('acct')}</strong> }} />,
          confirm: intl.formatMessage(messages.followConfirm),
          onConfirm: () => dispatch(followAccount(account.get('id'))),
        }));
      } else {
        dispatch(followAccount(account.get('id')));
      }
    }
  },
});

class Account extends ImmutablePureComponent {

  static propTypes = {
    account: ImmutablePropTypes.map.isRequired,
    onFollow: PropTypes.func.isRequired,
    intl: PropTypes.object.isRequired,
  };

  handleFollow = () => {
    this.props.onFollow(this.props.account);
  }

  render () {
    const { account, intl } = this.props;

    let buttons;

    if (account.get('id') !== me && account.get('relationship', null) !== null) {
      const following   = account.getIn(['relationship', 'following']);
      const delivery    = account.getIn(['relationship', 'delivery_following']);
      const followed_by = account.getIn(['relationship', 'followed_by']) && show_followed_by;
      const requested   = account.getIn(['relationship', 'requested']);

      if (!account.get('moved') || following) {
        if (requested) {
          buttons = <IconButton icon='hourglass' title={intl.formatMessage(messages.requested)} active={followed_by} onClick={this.handleFollow} />;
        } else {
          buttons = <IconButton disabled={following ? disableUnfollow : disableFollow} icon={following ? 'user-times' : 'user-plus'} title={intl.formatMessage(following ? messages.unfollow : messages.follow)} onClick={this.handleFollow} active={following} passive={followed_by} no_delivery={following && !delivery} />;
        }
      }
    }

    return (
      <div className='account'>
        <div className='account__wrapper'>
          <div className='account__display-name'>
            <div className='account__avatar-wrapper'><Avatar account={account} size={36} /></div>
            <DisplayName account={account} />
          </div>

          <div className='account__relationship'>
            {buttons}
          </div>
        </div>
      </div>
    );
  }

}

export default injectIntl(connect(MapStateToProps, mapDispatchToProps)(Account));
