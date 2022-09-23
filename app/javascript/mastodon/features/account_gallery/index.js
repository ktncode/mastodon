import React from 'react';
import { connect } from 'react-redux';
import ImmutablePropTypes from 'react-immutable-proptypes';
import PropTypes from 'prop-types';
import { fetchAccount } from 'mastodon/actions/accounts';
import { expandAccountMediaTimeline } from '../../actions/timelines';
import LoadingIndicator from 'mastodon/components/loading_indicator';
import Column from '../../components/column';
import ColumnHeader from '../../components/column_header';
import ColumnSettingsContainer from '../account_timeline/containers/column_settings_container';
import ImmutablePureComponent from 'react-immutable-pure-component';
import { getAccountGallery } from 'mastodon/selectors';
import MediaItem from './components/media_item';
import HeaderContainer from '../account_timeline/containers/header_container';
import ScrollContainer from 'mastodon/containers/scroll_container';
import LoadMore from 'mastodon/components/load_more';
import MissingIndicator from 'mastodon/components/missing_indicator';
import { openModal } from 'mastodon/actions/modal';
import { new_features_policy, defaultColumnWidth } from 'mastodon/initial_state';
import { defineMessages, injectIntl, FormattedMessage } from 'react-intl';
import { changeSetting } from '../../actions/settings';

const messages = defineMessages({
  title: { id: 'column.account', defaultMessage: 'Account' },
});

const mapStateToProps = (state, props) => ({
  isAccount: !!state.getIn(['accounts', props.params.accountId]),
  attachments: getAccountGallery(state, props.params.accountId),
  isLoading: state.getIn(['timelines', `account:${props.params.accountId}:media`, 'isLoading']),
  hasMore: state.getIn(['timelines', `account:${props.params.accountId}:media`, 'hasMore']),
  suspended: state.getIn(['accounts', props.params.accountId, 'suspended'], false),
  blockedBy: state.getIn(['relationships', props.params.accountId, 'blocked_by'], false),
  advancedMode: state.getIn(['settings', 'account', 'other', 'advancedMode'], new_features_policy === 'conservative' ? false : true),
  hideRelation: state.getIn(['settings', 'account', 'other', 'hideRelation'], false),
  columnWidth: state.getIn(['settings', 'account', 'columnWidth'], defaultColumnWidth),
});

class LoadMoreMedia extends ImmutablePureComponent {

  static propTypes = {
    maxId: PropTypes.string,
    onLoadMore: PropTypes.func.isRequired,
  };

  handleLoadMore = () => {
    this.props.onLoadMore(this.props.maxId);
  }

  render () {
    return (
      <LoadMore
        disabled={this.props.disabled}
        onClick={this.handleLoadMore}
      />
    );
  }

}

export default @connect(mapStateToProps)
@injectIntl
class AccountGallery extends ImmutablePureComponent {

  static propTypes = {
    params: PropTypes.object.isRequired,
    dispatch: PropTypes.func.isRequired,
    attachments: ImmutablePropTypes.list.isRequired,
    isLoading: PropTypes.bool,
    hasMore: PropTypes.bool,
    isAccount: PropTypes.bool,
    advancedMode: PropTypes.bool,
    hideRelation: PropTypes.bool,
    blockedBy: PropTypes.bool,
    suspended: PropTypes.bool,
    multiColumn: PropTypes.bool,
    columnWidth: PropTypes.string,
  };

  state = {
    width: 323,
  };

  componentDidMount () {
    this.props.dispatch(fetchAccount(this.props.params.accountId));
    this.props.dispatch(expandAccountMediaTimeline(this.props.params.accountId));
  }

  componentWillReceiveProps (nextProps) {
    if (nextProps.params.accountId !== this.props.params.accountId && nextProps.params.accountId) {
      this.props.dispatch(fetchAccount(nextProps.params.accountId));
      this.props.dispatch(expandAccountMediaTimeline(this.props.params.accountId));
    }
  }

  handleScrollToBottom = () => {
    if (this.props.hasMore) {
      this.handleLoadMore(this.props.attachments.size > 0 ? this.props.attachments.last().getIn(['status', 'id']) : undefined);
    }
  }

  handleScroll = e => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const offset = scrollHeight - scrollTop - clientHeight;

    if (150 > offset && !this.props.isLoading) {
      this.handleScrollToBottom();
    }
  }

  handleLoadMore = maxId => {
    this.props.dispatch(expandAccountMediaTimeline(this.props.params.accountId, { maxId }));
  };

  handleLoadOlder = e => {
    e.preventDefault();
    this.handleScrollToBottom();
  }

  handleOpenMedia = attachment => {
    const { dispatch } = this.props;
    const statusId = attachment.getIn(['status', 'id']);

    if (attachment.get('type') === 'video') {
      dispatch(openModal('VIDEO', { media: attachment, statusId, options: { autoPlay: true } }));
    } else if (attachment.get('type') === 'audio') {
      dispatch(openModal('AUDIO', { media: attachment, statusId, options: { autoPlay: true } }));
    } else {
      const media = attachment.getIn(['status', 'media_attachments']);
      const index = media.findIndex(x => x.get('id') === attachment.get('id'));

      dispatch(openModal('MEDIA', { media, index, statusId }));
    }
  }

  handleRef = c => {
    if (c) {
      this.setState({ width: c.offsetWidth });
    }
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
    const { attachments, isLoading, hasMore, isAccount, multiColumn, blockedBy, suspended, hideRelation, columnWidth, intl } = this.props;
    const { width } = this.state;

    if (!isAccount) {
      return (
        <Column>
          <MissingIndicator />
        </Column>
      );
    }

    if (!attachments && isLoading) {
      return (
        <Column>
          <LoadingIndicator />
        </Column>
      );
    }

    let loadOlder = null;

    if (hasMore && !(isLoading && attachments.size === 0)) {
      loadOlder = <LoadMore visible={!isLoading} onClick={this.handleLoadOlder} />;
    }

    let emptyMessage;

    if (suspended) {
      emptyMessage = <FormattedMessage id='empty_column.account_suspended' defaultMessage='Account suspended' />;
    } else if (blockedBy) {
      emptyMessage = <FormattedMessage id='empty_column.account_unavailable' defaultMessage='Profile unavailable' />;
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

        <ScrollContainer scrollKey='account_gallery'>
          <div className='scrollable scrollable--flex' onScroll={this.handleScroll}>
            <HeaderContainer accountId={this.props.params.accountId} hideProfile hideRelation={hideRelation} hideFeaturedTags />

            {(suspended || blockedBy) ? (
              <div className='empty-column-indicator'>
                {emptyMessage}
              </div>
            ) : (
              <div role='feed' className='account-gallery__container' ref={this.handleRef}>
                {attachments.map((attachment, index) => attachment === null ? (
                  <LoadMoreMedia key={'more:' + attachments.getIn(index + 1, 'id')} maxId={index > 0 ? attachments.getIn(index - 1, 'id') : null} onLoadMore={this.handleLoadMore} />
                ) : (
                  <MediaItem key={attachment.get('id')} attachment={attachment} displayWidth={width} onOpenMedia={this.handleOpenMedia} />
                ))}

                {loadOlder}
              </div>
            )}

            {isLoading && attachments.size === 0 && (
              <div className='scrollable__append'>
                <LoadingIndicator />
              </div>
            )}
          </div>
        </ScrollContainer>
      </Column>
    );
  }

}
