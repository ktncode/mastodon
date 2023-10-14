import { connect } from 'react-redux';
import { cancelQuoteCompose } from '../../../actions/compose';
import { openModal } from '../../../actions/modal';
import { makeGetStatus } from '../../../selectors';
import QuoteIndicator from '../components/quote_indicator';
import { defineMessages, injectIntl } from 'react-intl';

const messages = defineMessages({
  cancelQuoteConfirm: { id: 'confirmations.cancel_quote.confirm', defaultMessage: 'Canceling quote' },
  cancelQuoteMessage: { id: 'confirmations.cancel_quote.message', defaultMessage: 'Canceling a quote will erase the message you are currently composing. Are you sure you want to proceed?' },
});

const makeMapStateToProps = () => {
  const getStatus = makeGetStatus();

  const mapStateToProps = state => ({
    status: getStatus(state, { id: state.getIn(['compose', 'quote_from']) }),
    isScheduledStatusEditting: !!state.getIn(['compose', 'scheduled_status_id']),
  });

  return mapStateToProps;
};

const mapDispatchToProps = (dispatch, { intl }) => ({

  onCancel () {
    dispatch((_, getState) => {
      let state = getState();

      if (state.getIn(['compose', 'text']).trim().length !== 0 && state.getIn(['compose', 'dirty'])) {
        dispatch(openModal('CONFIRM', {
          message: intl.formatMessage(messages.cancelQuoteMessage),
          confirm: intl.formatMessage(messages.cancelQuoteConfirm),
          onConfirm: () => dispatch(cancelQuoteCompose()),
        }));
      } else {
        dispatch(cancelQuoteCompose());
      }
    });
  },

});

export default injectIntl(connect(makeMapStateToProps, mapDispatchToProps)(QuoteIndicator));
