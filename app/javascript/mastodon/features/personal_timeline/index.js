import React from 'react';
import { connect } from 'react-redux';
import { expandPersonalTimeline } from '../../actions/timelines';
import PropTypes from 'prop-types';
import StatusListContainer from '../ui/containers/status_list_container';
import Column from '../../components/column';
import ColumnHeader from '../../components/column_header';
import { addColumn, removeColumn, moveColumn } from '../../actions/columns';
import { defineMessages, injectIntl, FormattedMessage } from 'react-intl';
import ColumnSettingsContainer from './containers/column_settings_container';
import { defaultColumnWidth } from 'mastodon/initial_state';
import { changeSetting } from '../../actions/settings';
import { changeColumnParams } from '../../actions/columns';

const messages = defineMessages({
  title: { id: 'column.personal', defaultMessage: 'Personal' },
});

const mapStateToProps = (state, { columnId }) => {
  const uuid = columnId;
  const columns = state.getIn(['settings', 'columns']);
  const index = columns.findIndex(c => c.get('uuid') === uuid);
  const onlyMedia = (columnId && index >= 0) ? columns.get(index).getIn(['params', 'other', 'onlyMedia']) : state.getIn(['settings', 'personal', 'other', 'onlyMedia']);
  const withoutMedia = (columnId && index >= 0) ? columns.get(index).getIn(['params', 'other', 'withoutMedia']) : state.getIn(['settings', 'personal', 'other', 'withoutMedia']);
  const columnWidth = (columnId && index >= 0) ? columns.get(index).getIn(['params', 'columnWidth']) : state.getIn(['settings', 'personal', 'columnWidth']);

  return {
    hasUnread: state.getIn(['timelines', 'personal', 'unread']) > 0,
    onlyMedia,
    withoutMedia,
    columnWidth: columnWidth ?? defaultColumnWidth,
  };
};

export default @connect(mapStateToProps)
@injectIntl
class PersonalTimeline extends React.PureComponent {

  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    intl: PropTypes.object.isRequired,
    hasUnread: PropTypes.bool,
    columnId: PropTypes.string,
    onlyMedia: PropTypes.bool,
    withoutMedia: PropTypes.bool,
    multiColumn: PropTypes.bool,
    columnWidth: PropTypes.string,
  };

  static defaultProps = {
    onlyMedia: false,
    withoutMedia: false,
  };

  handlePin = () => {
    const { columnId, dispatch, onlyMedia, withoutMedia } = this.props;

    if (columnId) {
      dispatch(removeColumn(columnId));
    } else {
      dispatch(addColumn('PERSONAL', { other: { onlyMedia, withoutMedia } }));
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

  handleLoadMore = maxId => {
    const { dispatch, onlyMedia, withoutMedia } = this.props;

    dispatch(expandPersonalTimeline({ maxId, onlyMedia, withoutMedia }));
  }

  componentDidMount () {
    const { dispatch, onlyMedia, withoutMedia } = this.props;

    dispatch(expandPersonalTimeline({ onlyMedia, withoutMedia }));
  }

  componentDidUpdate (prevProps) {
    const { dispatch, onlyMedia, withoutMedia } = this.props;

    if (prevProps.onlyMedia !== onlyMedia || prevProps.withoutMedia !== withoutMedia) {
      dispatch(expandPersonalTimeline({ onlyMedia, withoutMedia }));
    }
  }

  handleWidthChange = (value) => {
    const { columnId, dispatch } = this.props;

    if (columnId) {
      dispatch(changeColumnParams(columnId, 'columnWidth', value));
    } else {
      dispatch(changeSetting(['personal', 'columnWidth'], value));
    }
  }

  render () {
    const { intl, hasUnread, columnId, multiColumn, columnWidth, onlyMedia, withoutMedia } = this.props;
    const pinned = !!columnId;

    return (
      <Column bindToDocument={!multiColumn} ref={this.setRef} label={intl.formatMessage(messages.title)} columnWidth={columnWidth}>
        <ColumnHeader
          icon='lock'
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
          timelineId={`personal${withoutMedia ? ':nomedia' : ''}${onlyMedia ? ':media' : ''}`}
          onLoadMore={this.handleLoadMore}
          trackScroll={!pinned}
          scrollKey={`personal_timeline-${columnId}`}
          emptyMessage={<FormattedMessage id='empty_column.personal' defaultMessage='Personal posts unavailable' />}
          bindToDocument={!multiColumn}
          showCard={!withoutMedia}
        />
      </Column>
    );
  }

}
