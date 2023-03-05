import { connect } from 'react-redux';
import ScheduledStatus from '../components/scheduled_status';
import { deleteScheduledStatus, redraftScheduledStatus } from 'mastodon/actions/scheduled_statuses';
import { openModal } from 'mastodon/actions/modal';
import { defineMessages, injectIntl } from 'react-intl';
import { deleteScheduledStatusModal } from 'mastodon/initial_state';

const messages = defineMessages({
  deleteConfirm: { id: 'confirmations.delete.confirm', defaultMessage: 'Delete' },
  deleteMessage: { id: 'confirmations.delete.message', defaultMessage: 'Are you sure you want to delete this status?' },
  redraftConfirm: { id: 'confirmations.redraft_scheduled_status.confirm', defaultMessage: 'View & redraft' },
  redraftMessage: { id: 'confirmations.redraft_scheduled_status.message', defaultMessage: 'Redraft now will overwrite the message you are currently composing. Are you sure you want to proceed?' },
});

const mapDispatchToProps = (dispatch, { intl }) => ({

  onDeleteScheduledStatus (id, e) {
    if (e.shiftKey ^ !deleteScheduledStatusModal) {
      dispatch(deleteScheduledStatus(id));
    } else {
      dispatch(openModal('CONFIRM', {
        message: intl.formatMessage(messages.deleteMessage),
        confirm: intl.formatMessage(messages.deleteConfirm),
        onConfirm: () => dispatch(deleteScheduledStatus(id)),
      }));
    }
  },

  onRedraftScheduledStatus (scheduledStatus, history) {
    dispatch((_, getState) => {
      let state = getState();

      if (state.getIn(['compose', 'text']).trim().length !== 0 && state.getIn(['compose', 'dirty'])) {
        dispatch(openModal('CONFIRM', {
          message: intl.formatMessage(messages.redraftMessage),
          confirm: intl.formatMessage(messages.redraftConfirm),
          onConfirm: () => dispatch(redraftScheduledStatus(scheduledStatus, history)),
        }));
      } else {
        dispatch(redraftScheduledStatus(scheduledStatus, history));
      }
    });
  },

});

export default injectIntl(connect(null, mapDispatchToProps)(ScheduledStatus));
