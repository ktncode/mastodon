import React from 'react';
import PropTypes from 'prop-types';
import { defineMessages, FormattedMessage, injectIntl } from 'react-intl';
import ImmutablePureComponent from 'react-immutable-pure-component';
import Icon from 'mastodon/components/icon';
import IconButton from '../../../components/icon_button';
import { formatDuration } from 'date-fns';

const messages = defineMessages({
  cancel: { id: 'expires_indicator.cancel', defaultMessage: 'Cancel' },
  expires_mark: { id: 'datetime.expires_action.mark', defaultMessage: 'Mark as expired' },
  expires_delete: { id: 'datetime.expires_action.delete', defaultMessage: 'Delete' },
});

export default @injectIntl
class ExpiresIndicator extends ImmutablePureComponent {

  static propTypes = {
    default_expires: PropTypes.bool,
    expires: PropTypes.string,
    expires_action: PropTypes.string,
    onCancel: PropTypes.func.isRequired,
    intl: PropTypes.object.isRequired,
  };

  handleClick = () => {
    this.props.onCancel();
  }

  render () {
    const { default_expires, expires, expires_action, intl } = this.props;

    if (!default_expires) {
      return null;
    }

    const [, years = 0, months = 0, days = 0, hours = 0, minutes = 0] = expires.match(/^(?:(\d+)y)?(?:(\d+)m(?=[\do])o?)?(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?$/) ?? [];
    const duration_message = formatDuration({ years: Number(years), months: Number(months), days: Number(days), hours: Number(hours), minutes: Number(minutes) });

    const expires_action_message = (expires_action => {
      switch (expires_action) {
      case 'mark':
        return intl.formatMessage(messages.expires_mark);
      case 'delete':
        return intl.formatMessage(messages.expires_delete);
      default:
        return '';
      }
    })(expires_action);

    return (
      <div className='compose-form__datetime-wrapper'>
        <div className='datetime__expires-indicator'>
          <div className='datetime__expires-indicator__icon'>
            <Icon id='calendar' fixedWidth />
          </div>
          <div className='datetime__expires-indicator__message'>
            <div className='expires-indicator__cancel'><IconButton title={intl.formatMessage(messages.cancel)} icon='times' onClick={this.handleClick} inverted /></div>
            <FormattedMessage id='expires_indicator.message' defaultMessage='{action} after {duration}' values={{ action: expires_action_message, duration: duration_message }} />
          </div>
        </div>
      </div>
    );
  }

}
