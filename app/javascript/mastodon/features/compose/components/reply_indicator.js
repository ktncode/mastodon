import React from 'react';
import ImmutablePropTypes from 'react-immutable-proptypes';
import PropTypes from 'prop-types';
import Avatar from '../../../components/avatar';
import IconButton from '../../../components/icon_button';
import DisplayName from '../../../components/display_name';
import { defineMessages, injectIntl } from 'react-intl';
import ImmutablePureComponent from 'react-immutable-pure-component';
import AttachmentList from 'mastodon/components/attachment_list';

const messages = defineMessages({
  cancel: { id: 'reply_indicator.cancel', defaultMessage: 'Cancel' },
});

export default @injectIntl
class ReplyIndicator extends ImmutablePureComponent {

  static contextTypes = {
    router: PropTypes.object,
  };

  static propTypes = {
    status: ImmutablePropTypes.map,
    isScheduledStatusEditting: PropTypes.bool,
    onCancel: PropTypes.func.isRequired,
    intl: PropTypes.object.isRequired,
  };

  handleClick = () => {
    this.props.onCancel();
  }

  handleAccountClick = (e) => {
    if (e.button === 0 && !(e.ctrlKey || e.metaKey)) {
      const { status } = this.props;
      e.preventDefault();
      if (status.getIn(['account', 'group'], false)) {
        this.context.router.history.push(`/timelines/groups/${status.getIn(['account', 'id'])}`);
      } else {
        this.context.router.history.push(`/accounts/${status.getIn(['account', 'id'])}`);
      }
    }
  }

  render () {
    const { status, isScheduledStatusEditting, intl } = this.props;

    if (!status) {
      return null;
    }

    const content = { __html: status.get('contentHtml') };

    return (
      <div className='reply-indicator'>
        <div className='reply-indicator__header'>
          {!isScheduledStatusEditting && <div className='reply-indicator__cancel'><IconButton title={intl.formatMessage(messages.cancel)} icon='times' onClick={this.handleClick} inverted /></div>}

          <a href={status.getIn(['account', 'url'])} onClick={this.handleAccountClick} className='reply-indicator__display-name'>
            <div className='reply-indicator__display-avatar'><Avatar account={status.get('account')} size={24} /></div>
            <DisplayName account={status.get('account')} />
          </a>
        </div>

        <div className='reply-indicator__content translate' dangerouslySetInnerHTML={content} />

        {status.get('media_attachments').size > 0 && (
          <AttachmentList
            compact
            media={status.get('media_attachments')}
          />
        )}
      </div>
    );
  }

}
