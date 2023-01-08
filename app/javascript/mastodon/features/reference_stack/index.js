import React, { Fragment } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import StackHeader from '../ui/components/stack_header';
import ReferencesCounterIcon from '../ui/components/references_counter_icon';
import { defineMessages, injectIntl, FormattedMessage } from 'react-intl';
import ImmutablePureComponent from 'react-immutable-pure-component';
import { openModal } from '../../actions/modal';
import Icon from 'mastodon/components/icon';
import StatusItemContainer from '../../containers/status_item_container';

import {
  resetReference,
} from '../../actions/compose';
import { enableStatusReference } from '../../initial_state';

const messages = defineMessages({
  clearMessage: { id: 'confirmations.clear.message', defaultMessage: 'Are you sure you want to clear this post reference lists?' },
  clearConfirm: { id: 'confirmations.clear.confirm', defaultMessage: 'Clear' },
});

const mapStateToProps = (state) => ({
  statusIds: state.getIn(['compose', 'references']).toList().sort((a, b) => b - a),
});

export default @injectIntl
@connect(mapStateToProps)
class ReferenceStack extends ImmutablePureComponent {

  static contextTypes = {
    router: PropTypes.object,
  };

  static propTypes = {
    statusIds: ImmutablePropTypes.list,
    dispatch: PropTypes.func.isRequired,
    intl: PropTypes.object.isRequired,
    multiColumn: PropTypes.bool,
  };

  handleClearClick = (e) => {
    const { dispatch, intl } = this.props;

    if (e && e.shiftKey) {
      dispatch(resetReference());
    } else {
      dispatch(openModal('CONFIRM', {
        message: intl.formatMessage(messages.clearMessage),
        confirm: intl.formatMessage(messages.clearConfirm),
        onConfirm: () => dispatch(resetReference()),
      }));
    }
  }

  handleHeaderClick = () => {}
  handleLoadMore = () => {}

  render () {
    const { statusIds, intl } = this.props;

    if (!enableStatusReference || statusIds.isEmpty()) {
      return <Fragment />;
    }

    const title = (
      <Fragment>
        <ReferencesCounterIcon className='reference-stack__icon' /><FormattedMessage id='reference_stack.header' defaultMessage='Selected reference postings' />
      </Fragment>
    );

    const extraButton = (
      <button
        aria-label={intl.formatMessage(messages.clearConfirm)}
        title={intl.formatMessage(messages.clearConfirm)}
        onClick={this.handleClearClick}
        className='stack-header__button'
      >
        <Icon id='eraser' />
      </button>
    );

    return (
      <div className='reference-stack'>
        <StackHeader
          title={title}
          onClick={this.handleHeaderClick}
          extraButton={extraButton}
        />
        <div className='reference-stack__list'>
          {statusIds.map(statusId => <StatusItemContainer key={statusId} id={statusId} />)}
        </div>
      </div>
    );
  }

}
