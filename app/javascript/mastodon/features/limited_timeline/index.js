import React from 'react';
import { connect } from 'react-redux';
import { expandLimitedTimeline } from '../../actions/timelines';
import PropTypes from 'prop-types';
import StatusListContainer from '../ui/containers/status_list_container';
import Column from '../../components/column';
import ColumnHeader from '../../components/column_header';
import { addColumn, removeColumn, moveColumn } from '../../actions/columns';
import { getLimitedVisibilities } from 'mastodon/selectors';
import { defineMessages, injectIntl, FormattedMessage } from 'react-intl';
import ColumnSettingsContainer from './containers/column_settings_container';
import { defaultColumnWidth } from 'mastodon/initial_state';
import { changeSetting } from '../../actions/settings';
import { changeColumnParams } from '../../actions/columns';

const messages = defineMessages({
  title: { id: 'column.limited', defaultMessage: 'Limited' },
});

const mapStateToProps = (state, { columnId }) => {
  const uuid = columnId;
  const columns = state.getIn(['settings', 'columns']);
  const index = columns.findIndex(c => c.get('uuid') === uuid);
  const columnWidth = (columnId && index >= 0) ? columns.get(index).getIn(['params', 'columnWidth']) : state.getIn(['settings', 'limited', 'columnWidth']);

  return {
    hasUnread: state.getIn(['timelines', 'limited', 'unread']) > 0,
    visibilities: getLimitedVisibilities(state),
    columnWidth: columnWidth ?? defaultColumnWidth,
  };
};

export default @connect(mapStateToProps)
@injectIntl
class LimitedTimeline extends React.PureComponent {

  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    intl: PropTypes.object.isRequired,
    hasUnread: PropTypes.bool,
    visibilities: PropTypes.arrayOf(PropTypes.string),
    columnId: PropTypes.string,
    multiColumn: PropTypes.bool,
    columnWidth: PropTypes.string,
  };

  handlePin = () => {
    const { columnId, dispatch } = this.props;

    if (columnId) {
      dispatch(removeColumn(columnId));
    } else {
      dispatch(addColumn('LIMITED', {}));
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
    const { dispatch, visibilities } = this.props;

    dispatch(expandLimitedTimeline({ maxId, visibilities }));
  }

  componentDidMount () {
    const { dispatch, visibilities } = this.props;

    dispatch(expandLimitedTimeline({ visibilities }));
  }

  componentDidUpdate (prevProps) {
    const { dispatch, visibilities } = this.props;

    if (prevProps.visibilities.toString() !== visibilities.toString()) {
      dispatch(expandLimitedTimeline({ visibilities }));
    }
  }

  handleWidthChange = (value) => {
    const { columnId, dispatch } = this.props;

    if (columnId) {
      dispatch(changeColumnParams(columnId, 'columnWidth', value));
    } else {
      dispatch(changeSetting(['limited', 'columnWidth'], value));
    }
  }

  render () {
    const { intl, hasUnread, columnId, multiColumn, columnWidth } = this.props;
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
          <ColumnSettingsContainer />
        </ColumnHeader>

        <StatusListContainer
          trackScroll={!pinned}
          scrollKey={`limited_timeline-${columnId}`}
          onLoadMore={this.handleLoadMore}
          timelineId='limited'
          emptyMessage={<FormattedMessage id='empty_column.limited' defaultMessage='Your limited timeline is empty.' />}
          bindToDocument={!multiColumn}
        />
      </Column>
    );
  }

}
