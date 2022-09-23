import React from 'react';
import { connect } from 'react-redux';
import { injectIntl, FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import StatusListContainer from '../ui/containers/status_list_container';
import Column from '../../components/column';
import ColumnHeader from '../../components/column_header';
import { expandDomainTimeline } from '../../actions/timelines';
import { addColumn, removeColumn, moveColumn } from '../../actions/columns';
import ColumnSettingsContainer from './containers/column_settings_container';
import { connectDomainStream } from '../../actions/streaming';
import { defaultColumnWidth } from 'mastodon/initial_state';
import { changeSetting } from '../../actions/settings';
import { changeColumnParams } from '../../actions/columns';

const mapStateToProps = (state, props) => {
  const uuid = props.columnId;
  const columns = state.getIn(['settings', 'columns']);
  const index = columns.findIndex(c => c.get('uuid') === uuid);
  const columnWidth = (props.columnId && index >= 0) ? columns.get(index).getIn(['params', 'columnWidth']) : state.getIn(['settings', 'domain', 'columnWidth']);
  const onlyMedia = (props.columnId && index >= 0) ? columns.get(index).getIn(['params', 'other', 'onlyMedia']) : state.getIn(['settings', 'domain', 'other', 'onlyMedia']);
  const withoutMedia = (props.columnId && index >= 0) ? columns.get(index).getIn(['params', 'other', 'withoutMedia']) : state.getIn(['settings', 'domain', 'other', 'withoutMedia']);
  const withoutBot = (props.columnId && index >= 0) ? columns.get(index).getIn(['params', 'other', 'withoutBot']) : state.getIn(['settings', 'domain', 'other', 'withoutBot']);
  const timelineState = state.getIn(['timelines', `domain${withoutBot ? ':nobot' : ':bot'}${withoutMedia ? ':nomedia' : ''}${onlyMedia ? ':media' : ''}:${domain}`]);
  const domain = props.params.domain;

  return {
    hasUnread: !!timelineState && timelineState.get('unread') > 0,
    onlyMedia,
    withoutMedia,
    withoutBot,
    domain: domain,
    columnWidth: columnWidth ?? defaultColumnWidth,
  };
};

export default @connect(mapStateToProps)
@injectIntl
class DomainTimeline extends React.PureComponent {

  static contextTypes = {
    router: PropTypes.object,
  };

  static defaultProps = {
    onlyMedia: false,
    withoutMedia: false,
    withoutBot: false,
  };

  static propTypes = {
    params: PropTypes.object.isRequired,
    dispatch: PropTypes.func.isRequired,
    columnId: PropTypes.string,
    intl: PropTypes.object.isRequired,
    hasUnread: PropTypes.bool,
    multiColumn: PropTypes.bool,
    columnWidth: PropTypes.string,
    onlyMedia: PropTypes.bool,
    withoutMedia: PropTypes.bool,
    withoutBot: PropTypes.bool,
    domain: PropTypes.string,
  };

  handlePin = () => {
    const { columnId, dispatch, onlyMedia, withoutMedia, withoutBot, domain } = this.props;

    if (columnId) {
      dispatch(removeColumn(columnId));
    } else {
      dispatch(addColumn('DOMAIN', { domain, other: { onlyMedia, withoutMedia, withoutBot } }));
    }
  }

  handleMove = (dir) => {
    const { columnId, dispatch } = this.props;
    dispatch(moveColumn(columnId, dir));
  }

  handleHeaderClick = () => {
    this.column.scrollTop();
  }

  componentDidMount () {
    const { dispatch, onlyMedia, withoutMedia, withoutBot, domain } = this.props;

    dispatch(expandDomainTimeline(domain, { onlyMedia, withoutMedia, withoutBot }));
    this.disconnect = dispatch(connectDomainStream(domain, { onlyMedia, withoutMedia, withoutBot }));
  }

  componentDidUpdate (prevProps) {
    if (prevProps.onlyMedia !== this.props.onlyMedia || prevProps.withoutMedia !== this.props.withoutMedia || prevProps.withoutBot !== this.props.withoutBot || prevProps.domain !== this.props.domain) {
      const { dispatch, onlyMedia, withoutMedia, withoutBot, domain } = this.props;

      this.disconnect();
      dispatch(expandDomainTimeline(domain, { onlyMedia, withoutMedia, withoutBot }));
      this.disconnect = dispatch(connectDomainStream(domain, { onlyMedia, withoutMedia, withoutBot }));
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
    const { dispatch, onlyMedia, withoutMedia, withoutBot, domain } = this.props;

    dispatch(expandDomainTimeline(domain, { maxId, onlyMedia, withoutMedia, withoutBot }));
  }

  handleWidthChange = (value) => {
    const { columnId, dispatch } = this.props;

    if (columnId) {
      dispatch(changeColumnParams(columnId, 'columnWidth', value));
    } else {
      dispatch(changeSetting(['domain', 'columnWidth'], value));
    }
  }

  render () {
    const { hasUnread, columnId, multiColumn, onlyMedia, withoutMedia, withoutBot, domain, columnWidth } = this.props;
    const pinned = !!columnId;

    return (
      <Column bindToDocument={!multiColumn} ref={this.setRef} label={domain} columnWidth={columnWidth}>
        <ColumnHeader
          icon='users'
          active={hasUnread}
          title={domain}
          onPin={this.handlePin}
          onMove={this.handleMove}
          onClick={this.handleHeaderClick}
          pinned={pinned}
          multiColumn={multiColumn}
          showBackButton
          columnWidth={columnWidth}
          onWidthChange={this.handleWidthChange}
        >
          <ColumnSettingsContainer columnId={columnId} />
        </ColumnHeader>

        <StatusListContainer
          trackScroll={!pinned}
          scrollKey={`domain_timeline-${columnId}`}
          timelineId={`domain${withoutBot ? ':nobot' : ':bot'}${withoutMedia ? ':nomedia' : ''}${onlyMedia ? ':media' : ''}:${domain}`}
          onLoadMore={this.handleLoadMore}
          emptyMessage={<FormattedMessage id='empty_column.domain' defaultMessage='There is nothing here! Manually follow users from other servers to fill it up' />}
          bindToDocument={!multiColumn}
          showCard={!withoutMedia}
        />
      </Column>
    );
  }

}
