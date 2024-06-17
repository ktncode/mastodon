import React from 'react';
import { connect } from 'react-redux';
import ImmutablePropTypes from 'react-immutable-proptypes';
import PropTypes from 'prop-types';
import { defineMessages, injectIntl } from 'react-intl';
import ImmutablePureComponent from 'react-immutable-pure-component';
import { me, hideStatusesCountFromYourself, hideFollowingCountFromYourself, hideFollowersCountFromYourself, hideSubscribingCountFromYourself } from 'mastodon/initial_state';
import { counterRenderer } from 'mastodon/components/common_counter';
import ShortNumber from 'mastodon/components/short_number';
import { NavLink } from 'react-router-dom';
import classNames from 'classnames';

const messages = defineMessages({
  secret: { id: 'account.secret', defaultMessage: 'Secret' },
});

const mapStateToProps = (state) => ({
  hidePostCount: state.getIn(['settings', 'account', 'other', 'hidePostCount'], false),
  hideFollowingCount: state.getIn(['settings', 'account', 'other', 'hideFollowingCount'], false),
  hideFollowerCount: state.getIn(['settings', 'account', 'other', 'hideFollowerCount'], false),
  hideSubscribingCount: state.getIn(['settings', 'account', 'other', 'hideSubscribingCount'], false),
});

export default @connect(mapStateToProps)
@injectIntl
class HeaderExtraLinks extends ImmutablePureComponent {

  static propTypes = {
    account: ImmutablePropTypes.map,
    hidePostCount: PropTypes.bool,
    hideFollowingCount: PropTypes.bool,
    hideFollowerCount: PropTypes.bool,
    hideSubscribingCount: PropTypes.bool,
    intl: PropTypes.object.isRequired,
  };

  isStatusesPageActive = (match, location) => {
    if (!match) {
      return false;
    }

    return !location.pathname.match(/\/(followers|following|subscribing)\/?$/);
  }

  render () {
    const { account, hidePostCount, hideFollowingCount, hideFollowerCount, hideSubscribingCount, intl } = this.props;

    if (!account) {
      return null;
    }

    const suspended = account.get('suspended');

    const hide_statuses_count = account.get('id') === me && hideStatusesCountFromYourself || account.getIn(['other_settings', 'hide_statuses_count'], false);
    const hide_following_count = account.get('id') === me && hideFollowingCountFromYourself || account.getIn(['other_settings', 'hide_following_count'], false);
    const hide_followers_count = account.get('id') === me && hideFollowersCountFromYourself || account.getIn(['other_settings', 'hide_followers_count'], false);
    const hide_subscribing_count = account.get('id') === me && hideSubscribingCountFromYourself;

    return (
      <div className={classNames('account__header', 'advanced', { inactive: !!account.get('moved') })}>
        <div className='account__header__extra'>
          {!suspended && (
            <div className='account__header__extra__links'>
              {!hidePostCount &&
                <NavLink isActive={this.isStatusesPageActive} activeClassName='active' to={`/accounts/${account.get('id')}/posts`} title={hide_statuses_count ? intl.formatMessage(messages.secret) : intl.formatNumber(account.get('statuses_count'))}>
                  <ShortNumber
                    hide={hide_statuses_count}
                    value={account.get('statuses_count')}
                    renderer={counterRenderer('statuses')}
                  />
                </NavLink>
              }

              {!hideFollowingCount &&
                <NavLink exact activeClassName='active' to={`/accounts/${account.get('id')}/following`} title={hide_following_count ? intl.formatMessage(messages.secret) : intl.formatNumber(account.get('following_count'))}>
                  <ShortNumber
                    hide={hide_following_count}
                    value={account.get('following_count')}
                    renderer={counterRenderer('following')}
                  />
                </NavLink>
              }

              {!hideFollowerCount &&
                <NavLink exact activeClassName='active' to={`/accounts/${account.get('id')}/followers`} title={hide_followers_count ? intl.formatMessage(messages.secret) : intl.formatNumber(account.get('followers_count'))}>
                  <ShortNumber
                    hide={hide_followers_count}
                    value={account.get('followers_count')}
                    renderer={counterRenderer('followers')}
                  />
                </NavLink>
              }

              {!hideSubscribingCount && (me === account.get('id')) && (
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
    );
  }

}
