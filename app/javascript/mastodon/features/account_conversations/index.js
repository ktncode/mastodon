import React from 'react';
import { connect } from 'react-redux';
import ImmutablePropTypes from 'react-immutable-proptypes';
import PropTypes from 'prop-types';
import { fetchAccount } from '../../actions/accounts';
import { expandAccountCoversations } from '../../actions/timelines';
import StatusList from '../../components/status_list';
import LoadingIndicator from '../../components/loading_indicator';
import Column from '../../components/column';
import ColumnHeader from '../../components/column_header';
import ColumnSettingsContainer from '../account_timeline/containers/column_settings_container';
import HeaderContainer from '../account_timeline/containers/header_container';
import ColumnBackButton from '../../components/column_back_button';
import { List as ImmutableList } from 'immutable';
import ImmutablePureComponent from 'react-immutable-pure-component';
import { defineMessages, injectIntl, FormattedMessage } from 'react-intl';
import { fetchAccountIdentityProofs } from '../../actions/identity_proofs';
import MissingIndicator from 'mastodon/components/missing_indicator';
import TimelineHint from 'mastodon/components/timeline_hint';
import { me, new_features_policy, defaultColumnWidth } from 'mastodon/initial_state';
import { changeSetting } from '../../actions/settings';

const messages = defineMessages({
  title: { id: 'column.account', defaultMessage: 'Account' },
});

const emptyList = ImmutableList();

const mapStateToProps = (state, { params: { accountId } }) => {
  const hidePostCount = state.getIn(['settings', 'account', 'other', 'hidePostCount'], false);
  const hideFollowingCount = state.getIn(['settings', 'account', 'other', 'hideFollowingCount'], false);
  const hideFollowerCount = state.getIn(['settings', 'account', 'other', 'hideFollowerCount'], false);
  const hideSubscribingCount = state.getIn(['settings', 'account', 'other', 'hideSubscribingCount'], false);
  const hideRelation = hidePostCount && hideFollowingCount && hideFollowerCount && (me !== accountId || hideSubscribingCount);

  return {
    remote: !!(state.getIn(['accounts', accountId, 'acct']) !== state.getIn(['accounts', accountId, 'username'])),
    remoteUrl: state.getIn(['accounts', accountId, 'url']),
    isAccount: !!state.getIn(['accounts', accountId]),
    statusIds: state.getIn(['timelines', `account:${accountId}:conversations`, 'items'], emptyList),
    isLoading: state.getIn(['timelines', `account:${accountId}:conversations`, 'isLoading']),
    hasMore: state.getIn(['timelines', `account:${accountId}:conversations`, 'hasMore']),
    suspended: state.getIn(['accounts', accountId, 'suspended'], false),
    blockedBy: state.getIn(['relationships', accountId, 'blocked_by'], false),
    advancedMode: state.getIn(['settings', 'account', 'other', 'advancedMode'], new_features_policy === 'conservative' ? false : true),
    hideRelation,
    columnWidth: state.getIn(['settings', 'account', 'columnWidth'], defaultColumnWidth),
  };
};

const RemoteHint = ({ url }) => (
  <TimelineHint url={url} resource={<FormattedMessage id='timeline_hint.resources.statuses' defaultMessage='Older toots' />} />
);

RemoteHint.propTypes = {
  url: PropTypes.string.isRequired,
};

export default @connect(mapStateToProps)
@injectIntl
class AccountConversations extends ImmutablePureComponent {

  static propTypes = {
    params: PropTypes.object.isRequired,
    dispatch: PropTypes.func.isRequired,
    statusIds: ImmutablePropTypes.list,
    isLoading: PropTypes.bool,
    hasMore: PropTypes.bool,
    withReplies: PropTypes.bool,
    advancedMode: PropTypes.bool,
    hideRelation: PropTypes.bool,
    blockedBy: PropTypes.bool,
    isAccount: PropTypes.bool,
    suspended: PropTypes.bool,
    multiColumn: PropTypes.bool,
    columnWidth: PropTypes.string,
  };

  componentWillMount () {
    const { params: { accountId }, dispatch } = this.props;

    dispatch(fetchAccount(accountId));
    dispatch(fetchAccountIdentityProofs(accountId));

    dispatch(expandAccountCoversations(accountId));
  }

  componentWillReceiveProps (nextProps) {
    const { dispatch } = this.props;

    if (nextProps.params.accountId !== this.props.params.accountId && nextProps.params.accountId) {
      dispatch(fetchAccount(nextProps.params.accountId));
      dispatch(fetchAccountIdentityProofs(nextProps.params.accountId));

      dispatch(expandAccountCoversations(nextProps.params.accountId));
    }
  }

  handleLoadMore = maxId => {
    this.props.dispatch(expandAccountCoversations(this.props.params.accountId, { maxId }));
  }

  handleHeaderClick = () => {
    this.column.scrollTop();
  }

  handleWidthChange = (value) => {
    this.props.dispatch(changeSetting(['account', 'columnWidth'], value));
  }

  setRef = c => {
    this.column = c;
  }

  render () {
    const { statusIds, isLoading, hasMore, blockedBy, suspended, isAccount, multiColumn, hideRelation, columnWidth, intl } = this.props;

    if (!isAccount) {
      return (
        <Column>
          <ColumnBackButton multiColumn={multiColumn} />
          <MissingIndicator />
        </Column>
      );
    }

    if (!statusIds && isLoading) {
      return (
        <Column>
          <LoadingIndicator />
        </Column>
      );
    }

    let emptyMessage;

    if (suspended) {
      emptyMessage = <FormattedMessage id='empty_column.account_suspended' defaultMessage='Account suspended' />;
    } else if (blockedBy) {
      emptyMessage = <FormattedMessage id='empty_column.account_unavailable' defaultMessage='Profile unavailable' />;
    } else {
      emptyMessage = <FormattedMessage id='empty_column.conversation_unavailable' defaultMessage='No conversation with this user yet' />;
    }

    return (
      <Column bindToDocument={!multiColumn} ref={this.setRef} label={intl.formatMessage(messages.title)} columnWidth={columnWidth}>
        <ColumnHeader
          icon='user'
          active={false}
          title={intl.formatMessage(messages.title)}
          onClick={this.handleHeaderClick}
          pinned={false}
          multiColumn={multiColumn}
          columnWidth={columnWidth}
          onWidthChange={this.handleWidthChange}
        >
          <ColumnSettingsContainer />
        </ColumnHeader>

        <StatusList
          prepend={<HeaderContainer accountId={this.props.params.accountId} hideProfile hideRelation={hideRelation} hideFeaturedTags />}
          alwaysPrepend
          scrollKey='account_conversations'
          statusIds={(suspended || blockedBy) ? emptyList : statusIds}
          isLoading={isLoading}
          hasMore={hasMore}
          onLoadMore={this.handleLoadMore}
          emptyMessage={emptyMessage}
          bindToDocument={!multiColumn}
          timelineId='account_conversations'
        />
      </Column>
    );
  }

}
