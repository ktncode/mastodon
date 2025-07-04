import React from 'react';
import { connect } from 'react-redux';
import { defineMessages, injectIntl, FormattedMessage } from 'react-intl';
import { makeGetAccount } from '../selectors';
import Account from '../components/account';
import {
  followAccount,
  unfollowAccount,
  subscribeAccount,
  unsubscribeAccount,
  blockAccount,
  unblockAccount,
  muteAccount,
  unmuteAccount,
} from '../actions/accounts';
import { openModal } from '../actions/modal';
import { initMuteModal } from '../actions/mutes';
import { followModal, unfollowModal, subscribeModal, unsubscribeModal } from '../initial_state';

const messages = defineMessages({
  followConfirm: { id: 'confirmations.follow.confirm', defaultMessage: 'Follow' },
  unfollowConfirm: { id: 'confirmations.unfollow.confirm', defaultMessage: 'Unfollow' },
  subscribeConfirm: { id: 'confirmations.subscribe.confirm', defaultMessage: 'Subscribe' },
  unsubscribeConfirm: { id: 'confirmations.unsubscribe.confirm', defaultMessage: 'Unsubscribe' },
});

const makeMapStateToProps = () => {
  const getAccount = makeGetAccount();

  const mapStateToProps = (state, props) => ({
    account: getAccount(state, props.id),
  });

  return mapStateToProps;
};

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

  onSubscribe (account) {
    if (account.getIn(['relationship', 'subscribing', '-1'], new Map).size > 0) {
      if (unsubscribeModal) {
        dispatch(openModal('CONFIRM', {
          message: <FormattedMessage id='confirmations.unsubscribe.message' defaultMessage='Are you sure you want to unsubscribe {name}?' values={{ name: <strong>@{account.get('acct')}</strong> }} />,
          confirm: intl.formatMessage(messages.unsubscribeConfirm),
          onConfirm: () => dispatch(unsubscribeAccount(account.get('id'))),
        }));
      } else {
        dispatch(unsubscribeAccount(account.get('id')));
      }
    } else {
      if (subscribeModal) {
        dispatch(openModal('CONFIRM', {
          message: <FormattedMessage id='confirmations.subscribe.message' defaultMessage='Are you sure you want to subscribe {name}?' values={{ name: <strong>@{account.get('acct')}</strong> }} />,
          confirm: intl.formatMessage(messages.subscribeConfirm),
          onConfirm: () => dispatch(subscribeAccount(account.get('id'))),
        }));
      } else {
        dispatch(subscribeAccount(account.get('id')));
      }
    }
  },

  onAddToList (account){
    dispatch(openModal('LIST_ADDER', {
      accountId: account.get('id'),
    }));
  },

  onBlock (account) {
    if (account.getIn(['relationship', 'blocking'])) {
      dispatch(unblockAccount(account.get('id')));
    } else {
      dispatch(blockAccount(account.get('id')));
    }
  },

  onMute (account) {
    if (account.getIn(['relationship', 'muting'])) {
      dispatch(unmuteAccount(account.get('id')));
    } else {
      dispatch(initMuteModal(account));
    }
  },


  onMuteNotifications (account, notifications) {
    dispatch(muteAccount(account.get('id'), notifications));
  },
});

export default injectIntl(connect(makeMapStateToProps, mapDispatchToProps)(Account));
