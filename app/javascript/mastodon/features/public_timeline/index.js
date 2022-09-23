import React from 'react';
import { connect } from 'react-redux';
import { defineMessages, injectIntl, FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import StatusListContainer from '../ui/containers/status_list_container';
import Column from '../../components/column';
import ColumnHeader from '../../components/column_header';
import { expandPublicTimeline } from '../../actions/timelines';
import { addColumn, removeColumn, moveColumn } from '../../actions/columns';
import ColumnSettingsContainer from './containers/column_settings_container';
import { connectPublicStream } from '../../actions/streaming';
import { defaultColumnWidth } from 'mastodon/initial_state';
import { changeSetting } from '../../actions/settings';
import { changeColumnParams } from '../../actions/columns';

const messages = defineMessages({
  title: { id: 'column.public', defaultMessage: 'Federated timeline' },
});

const mapStateToProps = (state, { columnId }) => {
  const uuid = columnId;
  const columns = state.getIn(['settings', 'columns']);
  const index = columns.findIndex(c => c.get('uuid') === uuid);
  const onlyMedia = (columnId && index >= 0) ? columns.get(index).getIn(['params', 'other', 'onlyMedia']) : state.getIn(['settings', 'public', 'other', 'onlyMedia']);
  const withoutMedia = (columnId && index >= 0) ? columns.get(index).getIn(['params', 'other', 'withoutMedia']) : state.getIn(['settings', 'public', 'other', 'withoutMedia']);
  const withoutBot = (columnId && index >= 0) ? columns.get(index).getIn(['params', 'other', 'withoutBot']) : state.getIn(['settings', 'public', 'other', 'withoutBot']);
  const onlyRemote = (columnId && index >= 0) ? columns.get(index).getIn(['params', 'other', 'onlyRemote']) : state.getIn(['settings', 'public', 'other', 'onlyRemote']);
  const columnWidth = (columnId && index >= 0) ? columns.get(index).getIn(['params', 'columnWidth']) : state.getIn(['settings', 'public', 'columnWidth']);
  const timelineState = state.getIn(['timelines', `public${onlyRemote ? ':remote' : ''}${withoutBot ? ':nobot' : ':bot'}${withoutMedia ? ':nomedia' : ''}${onlyMedia ? ':media' : ''}`]);

  return {
    hasUnread: !!timelineState && timelineState.get('unread') > 0,
    onlyMedia,
    withoutMedia,
    withoutBot,
    onlyRemote,
    columnWidth: columnWidth ?? defaultColumnWidth,
  };
};

export default @connect(mapStateToProps)
@injectIntl
class PublicTimeline extends React.PureComponent {

  static contextTypes = {
    router: PropTypes.object,
  };

  static defaultProps = {
    onlyMedia: false,
    withoutMedia: false,
    withoutBot: false,
    onlyRemote: false,
  };

  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    intl: PropTypes.object.isRequired,
    columnId: PropTypes.string,
    multiColumn: PropTypes.bool,
    columnWidth: PropTypes.string,
    hasUnread: PropTypes.bool,
    onlyMedia: PropTypes.bool,
    withoutMedia: PropTypes.bool,
    withoutBot: PropTypes.bool,
    onlyRemote: PropTypes.bool,
  };

  handlePin = () => {
    const { columnId, dispatch, onlyMedia, withoutMedia, withoutBot, onlyRemote } = this.props;

    if (columnId) {
      dispatch(removeColumn(columnId));
    } else {
      dispatch(addColumn(onlyRemote ? 'REMOTE' : 'PUBLIC', { other: { onlyMedia, withoutMedia, withoutBot, onlyRemote } }));
    }
  }

  handleMove = (dir) => {
    const { columnId, dispatch } = this.props;
    dispatch(moveColumn(columnId, dir));
  }

  handleHeaderClick = () => {
    this.column.scrollTop();
  }

  handleWidthChange = (value) => {
    const { columnId, dispatch } = this.props;

    if (columnId) {
      dispatch(changeColumnParams(columnId, 'columnWidth', value));
    } else {
      dispatch(changeSetting(['public', 'columnWidth'], value));
    }
  }

  componentDidMount () {
    const { dispatch, onlyMedia, withoutMedia, withoutBot, onlyRemote } = this.props;

    dispatch(expandPublicTimeline({ onlyMedia, withoutMedia, withoutBot, onlyRemote }));
    this.disconnect = dispatch(connectPublicStream({ onlyMedia, withoutMedia, withoutBot, onlyRemote }));
  }

  componentDidUpdate (prevProps) {
    if (prevProps.onlyMedia !== this.props.onlyMedia || prevProps.withoutMedia !== this.props.withoutMedia || prevProps.withoutBot !== this.props.withoutBot || prevProps.onlyRemote !== this.props.onlyRemote) {
      const { dispatch, onlyMedia, withoutMedia, withoutBot, onlyRemote } = this.props;

      this.disconnect();
      dispatch(expandPublicTimeline({ onlyMedia, withoutMedia, withoutBot, onlyRemote }));
      this.disconnect = dispatch(connectPublicStream({ onlyMedia, withoutMedia, withoutBot, onlyRemote }));
    }
  }

  componentWillUnmount () {
    if (this.disconnect) {
      this.disconnect();
      this.disconnect = null;
    }
  }

  setRef = c => {
    this.column = c;
  }

  handleLoadMore = maxId => {
    const { dispatch, onlyMedia, withoutMedia, withoutBot, onlyRemote } = this.props;

    dispatch(expandPublicTimeline({ maxId, onlyMedia, withoutMedia, withoutBot, onlyRemote }));
  }

  render () {
    const { intl, columnId, hasUnread, multiColumn, onlyMedia, withoutMedia, withoutBot, onlyRemote, columnWidth } = this.props;
    const pinned = !!columnId;

    return (
      <Column bindToDocument={!multiColumn} ref={this.setRef} label={intl.formatMessage(messages.title)} columnWidth={columnWidth}>
        <ColumnHeader
          icon='globe'
          active={hasUnread}
          title={intl.formatMessage(messages.title)}
          onPin={this.handlePin}
          onMove={this.handleMove}
          onClick={this.handleHeaderClick}
          pinned={pinned}
          multiColumn={multiColumn}
          columnWidth={columnWidth}
          onWidthChange={this.handleWidthChange}
        >
          <ColumnSettingsContainer columnId={columnId} />
        </ColumnHeader>

        <StatusListContainer
          timelineId={`public${onlyRemote ? ':remote' : ''}${withoutBot ? ':nobot' : ':bot'}${withoutMedia ? ':nomedia' : ''}${onlyMedia ? ':media' : ''}`}
          onLoadMore={this.handleLoadMore}
          trackScroll={!pinned}
          scrollKey={`public_timeline-${columnId}`}
          emptyMessage={<FormattedMessage id='empty_column.public' defaultMessage='There is nothing here! Write something publicly, or manually follow users from other servers to fill it up' />}
          bindToDocument={!multiColumn}
          showCard={!withoutMedia}
        />
      </Column>
    );
  }

}
