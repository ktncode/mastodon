import { debounce } from 'lodash';
import React from 'react';
import ImmutablePropTypes from 'react-immutable-proptypes';
import PropTypes from 'prop-types';
import ScheduledStatusContainer from '../containers/scheduled_status_container';
import ImmutablePureComponent from 'react-immutable-pure-component';
import LoadGap from 'mastodon/components/load_gap';
import ScrollableList from 'mastodon/components/scrollable_list';

export default class ScheduledStatusList extends ImmutablePureComponent {

  static propTypes = {
    scrollKey: PropTypes.string.isRequired,
    scheduledStatuses: ImmutablePropTypes.list.isRequired,
    onLoadMore: PropTypes.func,
    onScrollToTop: PropTypes.func,
    onScroll: PropTypes.func,
    trackScroll: PropTypes.bool,
    isLoading: PropTypes.bool,
    hasMore: PropTypes.bool,
    prepend: PropTypes.node,
    emptyMessage: PropTypes.node,
    alwaysPrepend: PropTypes.bool,
    timelineId: PropTypes.string,
  };

  static defaultProps = {
    trackScroll: true,
  };

  getCurrentStatusIndex = id => {
    return this.props.scheduledStatuses.findIndex(v => v.get('id') === id);
  }

  handleMoveUp = id => {
    const elementIndex = this.getCurrentStatusIndex(id) - 1;
    this._selectChild(elementIndex, true);
  }

  handleMoveDown = id => {
    const elementIndex = this.getCurrentStatusIndex(id) + 1;
    this._selectChild(elementIndex, false);
  }

  handleLoadOlder = debounce(() => {
    this.props.onLoadMore(this.props.scheduledStatuses.size > 0 ? this.props.scheduledStatuses.last().get('id') : undefined);
  }, 300, { leading: true })

  _selectChild (index, align_top) {
    const container = this.node.node;
    const element = container.querySelector(`article:nth-of-type(${index + 1}) .focusable`);

    if (element) {
      if (align_top && container.scrollTop > element.offsetTop) {
        element.scrollIntoView(true);
      } else if (!align_top && container.scrollTop + container.clientHeight < element.offsetTop + element.offsetHeight) {
        element.scrollIntoView(false);
      }
      element.focus();
    }
  }

  setRef = c => {
    this.node = c;
  }

  render () {
    const { scheduledStatuses, onLoadMore, timelineId, ...other }  = this.props;
    const { isLoading } = other;

    let scrollableContent = (isLoading || scheduledStatuses.size > 0) ? (
      scheduledStatuses.map((scheduledStatus, index) => scheduledStatus === null ? (
        <LoadGap
          key={'gap:' + scheduledStatuses.getIn([index + 1, 'id'])}
          disabled={isLoading}
          maxId={index > 0 ? scheduledStatuses.get([index - 1, 'id']) : null}
          onClick={onLoadMore}
        />
      ) : (
        <ScheduledStatusContainer
          key={scheduledStatus.get('id')}
          scheduledStatus={scheduledStatus}
          onMoveUp={this.handleMoveUp}
          onMoveDown={this.handleMoveDown}
          contextType={timelineId}
          scrollKey={this.props.scrollKey}
        />
      ))
    ) : null;

    return (
      <ScrollableList {...other} showLoading={isLoading && scheduledStatuses.size === 0} onLoadMore={onLoadMore && this.handleLoadOlder} ref={this.setRef}>
        {scrollableContent}
      </ScrollableList>
    );
  }

}
