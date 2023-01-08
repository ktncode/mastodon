import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { fetchScheduledStatuses, expandScheduledStatuses } from '../../actions/scheduled_statuses';
import Column from '../ui/components/column';
import ColumnHeader from '../../components/column_header';
import { addColumn, removeColumn, moveColumn } from '../../actions/columns';
import ScheduledStatusList from './components/scheduled_status_list';
import { defineMessages, injectIntl, FormattedMessage } from 'react-intl';
import ImmutablePureComponent from 'react-immutable-pure-component';
import { List as ImmutableList } from 'immutable';
import { debounce } from 'lodash';
import { defaultColumnWidth } from 'mastodon/initial_state';
import { changeSetting } from '../../actions/settings';
import { changeColumnParams } from '../../actions/columns';

const messages = defineMessages({
  heading: { id: 'column.scheduled_statuses', defaultMessage: 'Scheduled Posts' },
});

const makeMapStateToProps = () => {
  const mapStateToProps = (state, { columnId }) => {
    const uuid = columnId;
    const columns = state.getIn(['settings', 'columns']);
    const index = columns.findIndex(c => c.get('uuid') === uuid);
    const columnWidth = (columnId && index >= 0) ? columns.get(index).getIn(['params', 'columnWidth']) : state.getIn(['settings', 'scheduled_statuses', 'columnWidth']);

    return {
      scheduledStatuses: state.getIn(['scheduled_statuses', 'items'], ImmutableList()),
      isLoading: state.getIn(['scheduled_statuses', 'isLoading'], true),
      hasMore: !!state.getIn(['scheduled_statuses', 'next']),
      columnWidth: columnWidth ?? defaultColumnWidth,
    };
  };

  return mapStateToProps;
};

export default @connect(makeMapStateToProps)
@injectIntl
class ScheduledStatus extends ImmutablePureComponent {

  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    scheduledStatuses: ImmutablePropTypes.list.isRequired,
    intl: PropTypes.object.isRequired,
    columnId: PropTypes.string,
    multiColumn: PropTypes.bool,
    columnWidth: PropTypes.string,
    hasMore: PropTypes.bool,
    isLoading: PropTypes.bool,
  };

  componentWillMount () {
    this.props.dispatch(fetchScheduledStatuses());
  }

  handlePin = () => {
    const { columnId, dispatch } = this.props;

    if (columnId) {
      dispatch(removeColumn(columnId));
    } else {
      dispatch(addColumn('SCHEDULED_STATUS', {}));
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
    this.props.dispatch(expandScheduledStatuses());
  }, 300, { leading: true })

  handleWidthChange = (value) => {
    const { columnId, dispatch } = this.props;

    if (columnId) {
      dispatch(changeColumnParams(columnId, 'columnWidth', value));
    } else {
      dispatch(changeSetting(['scheduled_statuses', 'columnWidth'], value));
    }
  }

  render () {
    const { intl, scheduledStatuses, columnId, multiColumn, hasMore, isLoading, columnWidth } = this.props;
    const pinned = !!columnId;

    const emptyMessage = <FormattedMessage id='empty_column.scheduled_statuses' defaultMessage='There are no scheduled posts. Posts with a scheduled publication date and time will show up here.' />;

    return (
      <Column bindToDocument={!multiColumn} ref={this.setRef} label={intl.formatMessage(messages.heading)} columnWidth={columnWidth}>
        <ColumnHeader
          icon='clock-o'
          title={intl.formatMessage(messages.heading)}
          onPin={this.handlePin}
          onMove={this.handleMove}
          onClick={this.handleHeaderClick}
          pinned={pinned}
          multiColumn={multiColumn}
          columnWidth={columnWidth}
          onWidthChange={this.handleWidthChange}
          showBackButton
        />

        <ScheduledStatusList
          trackScroll={!pinned}
          scheduledStatuses={scheduledStatuses}
          scrollKey={`scheduled_statuses-${columnId}`}
          hasMore={hasMore}
          isLoading={isLoading}
          onLoadMore={this.handleLoadMore}
          onDeleteScheduledStatus={this.handleDeleteScheduledStatus}
          emptyMessage={emptyMessage}
          bindToDocument={!multiColumn}
        />
      </Column>
    );
  }

}
