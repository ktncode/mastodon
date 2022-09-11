import React from 'react';
import { connect } from 'react-redux';
import ImmutablePropTypes from 'react-immutable-proptypes';
import PropTypes from 'prop-types';
import { fetchAccount } from '../../actions/accounts';
import { expandAccountCoversations } from '../../actions/timelines';
import StatusList from '../../components/status_list';
import LoadingIndicator from '../../components/loading_indicator';
import Column from '../ui/components/column';
import HeaderContainer from '../account_timeline/containers/header_container';
import ColumnBackButton from '../../components/column_back_button';
import { List as ImmutableList } from 'immutable';
import ImmutablePureComponent from 'react-immutable-pure-component';
import { FormattedMessage } from 'react-intl';
import { fetchAccountIdentityProofs } from '../../actions/identity_proofs';
import MissingIndicator from 'mastodon/components/missing_indicator';
import TimelineHint from 'mastodon/components/timeline_hint';

const emptyList = ImmutableList();

const mapStateToProps = (state, { params: { accountId } }) => {
  return {
    remote: !!(state.getIn(['accounts', accountId, 'acct']) !== state.getIn(['accounts', accountId, 'username'])),
    remoteUrl: state.getIn(['accounts', accountId, 'url']),
    isAccount: !!state.getIn(['accounts', accountId]),
    statusIds: state.getIn(['timelines', `account:${accountId}:conversations`, 'items'], emptyList),
    isLoading: state.getIn(['timelines', `account:${accountId}:conversations`, 'isLoading']),
    hasMore: state.getIn(['timelines', `account:${accountId}:conversations`, 'hasMore']),
    suspended: state.getIn(['accounts', accountId, 'suspended'], false),
    blockedBy: state.getIn(['relationships', accountId, 'blocked_by'], false),
  };
};

const RemoteHint = ({ url }) => (
  <TimelineHint url={url} resource={<FormattedMessage id='timeline_hint.resources.statuses' defaultMessage='Older toots' />} />
);

RemoteHint.propTypes = {
  url: PropTypes.string.isRequired,
};

export default @connect(mapStateToProps)
class AccountConversations extends ImmutablePureComponent {

  static propTypes = {
    params: PropTypes.object.isRequired,
    dispatch: PropTypes.func.isRequired,
    statusIds: ImmutablePropTypes.list,
    isLoading: PropTypes.bool,
    hasMore: PropTypes.bool,
    withReplies: PropTypes.bool,
    blockedBy: PropTypes.bool,
    isAccount: PropTypes.bool,
    suspended: PropTypes.bool,
    remote: PropTypes.bool,
    remoteUrl: PropTypes.string,
    multiColumn: PropTypes.bool,
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

  render () {
    const { statusIds, isLoading, hasMore, blockedBy, suspended, isAccount, multiColumn, remote, remoteUrl } = this.props;

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
    } else if (remote && statusIds.isEmpty()) {
      emptyMessage = <RemoteHint url={remoteUrl} />;
    } else {
      emptyMessage = <FormattedMessage id='empty_column.account_timeline' defaultMessage='No toots here!' />;
    }

    const remoteMessage = remote ? <RemoteHint url={remoteUrl} /> : null;

    return (
      <Column>
        <ColumnBackButton multiColumn={multiColumn} />

        <StatusList
          prepend={<HeaderContainer accountId={this.props.params.accountId} />}
          alwaysPrepend
          append={remoteMessage}
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
