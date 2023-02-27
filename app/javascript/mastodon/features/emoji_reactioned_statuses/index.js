import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { fetchEmojiReactionedStatuses, expandEmojiReactionedStatuses } from '../../actions/emoji_reactions';
import Column from '../ui/components/column';
import ColumnHeader from '../../components/column_header';
import { addColumn, removeColumn, moveColumn } from '../../actions/columns';
import ColumnSettingsContainer from './containers/column_settings_container';
import StatusList from '../../components/status_list';
import { defineMessages, injectIntl, FormattedMessage } from 'react-intl';
import ImmutablePureComponent from 'react-immutable-pure-component';
import { debounce } from 'lodash';
import { defaultColumnWidth } from 'mastodon/initial_state';
import { changeSetting } from '../../actions/settings';
import { changeColumnParams } from '../../actions/columns';

const messages = defineMessages({
  heading: { id: 'column.emoji_reactions', defaultMessage: 'EmojiReactions' },
});

const mapStateToProps = (state, { columnId }) => {
  const uuid = columnId;
  const columns = state.getIn(['settings', 'columns']);
  const index = columns.findIndex(c => c.get('uuid') === uuid);
  const onlyMedia = (columnId && index >= 0) ? columns.get(index).getIn(['params', 'other', 'onlyMedia']) : state.getIn(['settings', 'emoji_reactioned_statuses', 'other', 'onlyMedia']);
  const withoutMedia = (columnId && index >= 0) ? columns.get(index).getIn(['params', 'other', 'withoutMedia']) : state.getIn(['settings', 'emoji_reactioned_statuses', 'other', 'withoutMedia']);
  const columnWidth = (columnId && index >= 0) ? columns.get(index).getIn(['params', 'columnWidth']) : state.getIn(['settings', 'emoji_reactioned_statuses', 'columnWidth']);

  return {
    statusIds: state.getIn(['status_lists', 'emoji_reactions', 'items']),
    isLoading: state.getIn(['status_lists', 'emoji_reactions', 'isLoading'], true),
    hasMore: !!state.getIn(['status_lists', 'emoji_reactions', 'next']),
    onlyMedia,
    withoutMedia,
    columnWidth: columnWidth ?? defaultColumnWidth,
  };
};

export default @connect(mapStateToProps)
@injectIntl
class EmojiReactions extends ImmutablePureComponent {

  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    statusIds: ImmutablePropTypes.list.isRequired,
    intl: PropTypes.object.isRequired,
    columnId: PropTypes.string,
    multiColumn: PropTypes.bool,
    columnWidth: PropTypes.string,
    onlyMedia: PropTypes.bool,
    withoutMedia: PropTypes.bool,
    hasMore: PropTypes.bool,
    isLoading: PropTypes.bool,
  };

  static defaultProps = {
    onlyMedia: false,
    withoutMedia: false,
  };

  componentDidMount () {
    const { dispatch, onlyMedia, withoutMedia } = this.props;

    dispatch(fetchEmojiReactionedStatuses({ onlyMedia, withoutMedia }));
  }

  componentDidUpdate (prevProps) {
    const { dispatch, onlyMedia, withoutMedia } = this.props;

    if (prevProps.onlyMedia !== onlyMedia || prevProps.withoutMedia !== withoutMedia) {
      dispatch(fetchEmojiReactionedStatuses({ onlyMedia, withoutMedia }));
    }
  }

  handlePin = () => {
    const { columnId, dispatch, onlyMedia, withoutMedia } = this.props;

    if (columnId) {
      dispatch(removeColumn(columnId));
    } else {
      dispatch(addColumn('EMOJI_REACTIONS', { other: { onlyMedia, withoutMedia } }));
    }
  }

  handleMove = (dir) => {
    const { columnId, dispatch } = this.props;
    dispatch(moveColumn(columnId, dir));
  }

  handleHeaderClick = () => {
    this.column.scrollTop();
  }

  setRef = c => {
    this.column = c;
  }

  handleLoadMore = debounce(() => {
    this.props.dispatch(expandEmojiReactionedStatuses());
  }, 300, { leading: true })

  handleWidthChange = (value) => {
    const { columnId, dispatch } = this.props;

    if (columnId) {
      dispatch(changeColumnParams(columnId, 'columnWidth', value));
    } else {
      dispatch(changeSetting(['emoji_reactioned_statuses', 'columnWidth'], value));
    }
  }

  render () {
    const { intl, statusIds, columnId, multiColumn, hasMore, isLoading, columnWidth, withoutMedia } = this.props;
    const pinned = !!columnId;

    const emptyMessage = <FormattedMessage id='empty_column.emoji_reactioned_statuses' defaultMessage="You don't have any reaction posts yet. When you reaction one, it will show up here." />;

    return (
      <Column bindToDocument={!multiColumn} ref={this.setRef} label={intl.formatMessage(messages.heading)} columnWidth={columnWidth}>
        <ColumnHeader
          icon='star'
          title={intl.formatMessage(messages.heading)}
          onPin={this.handlePin}
          onMove={this.handleMove}
          onClick={this.handleHeaderClick}
          pinned={pinned}
          multiColumn={multiColumn}
          columnWidth={columnWidth}
          onWidthChange={this.handleWidthChange}
          showBackButton
        >
          <ColumnSettingsContainer columnId={columnId} />
        </ColumnHeader>

        <StatusList
          trackScroll={!pinned}
          statusIds={statusIds}
          scrollKey={`emoji_reactioned_statuses-${columnId}`}
          hasMore={hasMore}
          isLoading={isLoading}
          onLoadMore={this.handleLoadMore}
          emptyMessage={emptyMessage}
          bindToDocument={!multiColumn}
          showCard={!withoutMedia}
        />
      </Column>
    );
  }

}
