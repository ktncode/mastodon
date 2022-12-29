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
  const columnWidth = (columnId && index >= 0) ? columns.get(index).getIn(['params', 'columnWidth']) : state.getIn(['settings', 'personal', 'columnWidth']);

  return {
    hasUnread: state.getIn(['timelines', 'personal', 'unread']) > 0,
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
    multiColumn: PropTypes.bool,
    columnWidth: PropTypes.string,
  };

  handlePin = () => {
    const { columnId, dispatch } = this.props;

    if (columnId) {
      dispatch(removeColumn(columnId));
    } else {
      dispatch(addColumn('PERSONAL', {}));
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
    const { dispatch } = this.props;

    dispatch(expandPersonalTimeline({ maxId }));
  }

  componentDidMount () {
    const { dispatch } = this.props;

    dispatch(expandPersonalTimeline({}));
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
        />

        <StatusListContainer
          trackScroll={!pinned}
          scrollKey={`personal_timeline-${columnId}`}
          onLoadMore={this.handleLoadMore}
          timelineId='personal'
          emptyMessage={<FormattedMessage id='empty_column.personal' defaultMessage='Personal posts unavailable' />}
          bindToDocument={!multiColumn}
        />
      </Column>
    );
  }

}
