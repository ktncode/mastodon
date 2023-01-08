import React from 'react';
import PropTypes from 'prop-types';
import { fetchScheduledStatuses } from 'mastodon/actions/scheduled_statuses';
import { connect } from 'react-redux';
import { NavLink, withRouter } from 'react-router-dom';
import Icon from 'mastodon/components/icon';
import { List as ImmutableList } from 'immutable';
import { FormattedMessage } from 'react-intl';

const mapStateToProps = state => ({
  count: state.getIn(['scheduled_statuses', 'items'], ImmutableList()).size,
});

export default @withRouter
@connect(mapStateToProps)
class ScheduledStatusesNavLink extends React.Component {

  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    count: PropTypes.number.isRequired,
  };

  componentDidMount () {
    const { dispatch } = this.props;

    dispatch(fetchScheduledStatuses());
  }

  render () {
    const { count } = this.props;

    if (count === 0) {
      return null;
    }

    return <NavLink className='column-link column-link--transparent' to='/scheduled_statuses'><Icon className='column-link__icon' id='clock-o' fixedWidth /><FormattedMessage id='navigation_bar.scheduled_statuses' defaultMessage='Scheduled Posts' /></NavLink>;
  }

}
