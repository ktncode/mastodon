import React from 'react';
import PropTypes from 'prop-types';
import { injectIntl, defineMessages } from 'react-intl';
import Icon from 'mastodon/components/icon';

const messages = defineMessages({
  reload: { id: 'status.reload', defaultMessage: 'Reload' },
});

export default @injectIntl
class ReloadZone extends React.PureComponent {

  static propTypes = {
    onClick: PropTypes.func.isRequired,
    intl: PropTypes.object.isRequired,
  };

  handleClick = () => {
    this.props.onClick();
  }

  render () {
    const { intl } = this.props;

    return (
      <button className='load-more load-gap' onClick={this.handleClick} aria-label={intl.formatMessage(messages.reload)}>
        <Icon id='refresh' />
      </button>
    );
  }

}
