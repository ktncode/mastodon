import React from 'react';
import ImmutablePropTypes from 'react-immutable-proptypes';
import PropTypes from 'prop-types';
import { injectIntl, defineMessages, FormattedMessage } from 'react-intl';
import Permalink from './permalink';
import classnames from 'classnames';
import PollContainer from 'mastodon/containers/poll_container';
import Icon from 'mastodon/components/icon';
import { autoPlayGif, disableReactions } from 'mastodon/initial_state';

const messages = defineMessages({
  linkToAcct: { id: 'status.link_to_acct', defaultMessage: 'Link to @{acct}' },
  postByAcct: { id: 'status.post_by_acct', defaultMessage: 'Post by @{acct}' },
});

const MAX_HEIGHT = 642; // 20px * 32 (+ 2px padding at the top)

@injectIntl
export default class StatusContent extends React.PureComponent {

  static contextTypes = {
    router: PropTypes.object,
  };

  static propTypes = {
    status: ImmutablePropTypes.map.isRequired,
    expanded: PropTypes.bool,
    showThread: PropTypes.bool,
    onExpandedToggle: PropTypes.func,
    onClick: PropTypes.func,
    collapsable: PropTypes.bool,
    onCollapsedToggle: PropTypes.func,
    quote: PropTypes.bool,
    intl: PropTypes.object.isRequired,
  };

  state = {
    hidden: true,
  };

  _updateStatusLinks () {
    const { intl, status, collapsable, onClick, onCollapsedToggle } = this.props;
    const node = this.node;

    if (!node) {
      return;
    }

    const reference_link = node.querySelector('.reference-link-inline > a');
    if (reference_link && reference_link?.dataset?.statusId && !reference_link.hasReferenceClick ) {
      reference_link.addEventListener('click', this.onReferenceLinkClick.bind(this, reference_link.dataset.statusId), false);
      reference_link.setAttribute('target', '_blank');
      reference_link.setAttribute('rel', 'noopener noreferrer');
      reference_link.hasReferenceClick = true;
    }

    const links = node.querySelectorAll(':not(.reference-link-inline) > a');

    for (var i = 0; i < links.length; ++i) {
      let link = links[i];
      if (link.classList.contains('status-link')) {
        continue;
      }
      link.classList.add('status-link');

      let mention = status.get('mentions').find(item => link.href === item.get('url'));

      if (mention) {
        if (mention.get('group', false)) {
          link.addEventListener('click', this.onGroupMentionClick.bind(this, mention), false);
        } else {
          link.addEventListener('click', this.onMentionClick.bind(this, mention), false);
        }
        link.setAttribute('title', mention.get('acct'));
      } else if (link.textContent[0] === '#' || (link.previousSibling && link.previousSibling.textContent && link.previousSibling.textContent[link.previousSibling.textContent.length - 1] === '#')) {
        link.addEventListener('click', this.onHashtagClick.bind(this, link.text), false);
      } else if (link.classList.contains('account-url-link')) {
        link.setAttribute('title', intl.formatMessage(messages.linkToAcct, { acct: link.dataset.accountAcct }));
        link.addEventListener('click', this.onAccountUrlClick.bind(this, link.dataset.accountId, link.dataset.accountActorType), false);
      } else if (link.classList.contains('status-url-link') && ![status.get('uri'), status.get('url')].includes(link.href)) {
        link.setAttribute('title', intl.formatMessage(messages.postByAcct, { acct: link.dataset.statusAccountAcct }));
        link.addEventListener('click', this.onStatusUrlClick.bind(this, link.dataset.statusId), false);
      } else {
        link.setAttribute('title', link.href);
        link.classList.add('unhandled-link');
      }

      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    }

    if (status.get('collapsed', null) === null) {
      let collapsed =
          collapsable
          && onClick
          && node.clientHeight > MAX_HEIGHT
          && status.get('spoiler_text').length === 0;

      if(onCollapsedToggle) onCollapsedToggle(collapsed);

      status.set('collapsed', collapsed);
    }
  }

  handleMouseEnter = ({ currentTarget }) => {
    if (autoPlayGif) {
      return;
    }

    const emojis = currentTarget.querySelectorAll('.custom-emoji');

    for (var i = 0; i < emojis.length; i++) {
      let emoji = emojis[i];
      emoji.src = emoji.getAttribute('data-original');
    }
  }

  handleMouseLeave = ({ currentTarget }) => {
    if (autoPlayGif) {
      return;
    }

    const emojis = currentTarget.querySelectorAll('.custom-emoji');

    for (var i = 0; i < emojis.length; i++) {
      let emoji = emojis[i];
      emoji.src = emoji.getAttribute('data-static');
    }
  }

  componentDidMount () {
    this._updateStatusLinks();
  }

  componentDidUpdate () {
    this._updateStatusLinks();
  }

  onMentionClick = (mention, e) => {
    if (this.context.router && e.button === 0 && !(e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.context.router.history.push(`/accounts/${mention.get('id')}`);
    }
  }

  onGroupMentionClick = (mention, e) => {
    if (this.context.router && e.button === 0 && !(e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.context.router.history.push(`/timelines/groups/${mention.get('id')}`);
    }
  }

  onHashtagClick = (hashtag, e) => {
    hashtag = hashtag.replace(/^#/, '');

    if (this.context.router && e.button === 0 && !(e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.context.router.history.push(`/timelines/tag/${hashtag}`);
    }
  }

  onAccountUrlClick = (accountId, accountActorType, e) => {
    if (this.context.router && e.button === 0 && !(e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.context.router.history.push(`${accountActorType == 'Group' ? '/timelines/groups/' : '/accounts/'}${accountId}`);
    }
  }

  onStatusUrlClick = (statusId, e) => {
    if (this.context.router && e.button === 0 && !(e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.context.router.history.push(`/statuses/${statusId}`);
    }
  }

  onQuoteClick = (statusId, e) => {
    let statusUrl = `/statuses/${statusId}`;

    if (this.context.router && e.button === 0) {
      e.preventDefault();
      this.context.router.history.push(statusUrl);
    }
  }

  onReferenceLinkClick = (statusId, e) => {
    if (this.context.router && e.button === 0 && !(e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.context.router.history.push(`/statuses/${statusId}/references`);
    }
  }

  handleMouseDown = (e) => {
    this.startXY = [e.clientX, e.clientY];
  }

  handleMouseUp = (e) => {
    if (!this.startXY) {
      return;
    }

    const [ startX, startY ] = this.startXY;
    const [ deltaX, deltaY ] = [Math.abs(e.clientX - startX), Math.abs(e.clientY - startY)];

    let element = e.target;
    while (element) {
      if (element.localName === 'button' || element.localName === 'a' || element.localName === 'label') {
        return;
      }
      element = element.parentNode;
    }

    if (deltaX + deltaY < 5 && e.button === 0 && this.props.onClick) {
      this.props.onClick();
    }

    this.startXY = null;
  }

  handleSpoilerClick = (e) => {
    e.preventDefault();

    if (this.props.onExpandedToggle) {
      // The parent manages the state
      this.props.onExpandedToggle();
    } else {
      this.setState({ hidden: !this.state.hidden });
    }
  }

  setRef = (c) => {
    this.node = c;
  }

  render () {
    const { status, quote } = this.props;

    const hidden = this.props.onExpandedToggle ? !this.props.expanded : this.state.hidden;
    const renderReadMore = this.props.onClick && status.get('collapsed');
    const renderViewThread = this.props.showThread && (
      status.get('in_reply_to_id') && status.get('in_reply_to_account_id') === status.getIn(['account', 'id'])
    );
    const renderShowPoll = !!status.get('poll');

    const content = { __html: status.get('contentHtml') };
    const spoilerContent = { __html: status.get('spoilerHtml') };
    const language = status.get('language');
    const classNames = classnames('status__content', {
      'status__content--with-action': this.props.onClick && this.context.router,
      'status__content--with-spoiler': status.get('spoiler_text').length > 0,
      'status__content--collapsed': renderReadMore,
    });

    const showThreadButton = (
      <button className='status__content__read-more-button' onClick={this.props.onClick}>
        <FormattedMessage id='status.show_thread' defaultMessage='Show thread' />
      </button>
    );

    const readMoreButton = (
      <button className='status__content__read-more-button' onClick={this.props.onClick} key='read-more'>
        <FormattedMessage id='status.read_more' defaultMessage='Read more' /><Icon id='angle-right' fixedWidth />
      </button>
    );

    const showPollButton = (
      <button className='status__content__read-more-button' onClick={this.props.onClick} key='show-poll'>
        <FormattedMessage id='status.show_poll' defaultMessage='Show poll' /><Icon id='angle-right' fixedWidth />
      </button>
    );

    const pollContainer = (
      <PollContainer pollId={status.get('poll')} disabled={disableReactions} />
    );

    if (status.get('spoiler_text').length > 0) {
      let mentionsPlaceholder = '';

      const mentionLinks = status.get('mentions').map(item => (
        <Permalink to={`${(item.get('group', false)) ? '/timelines/groups/' : '/accounts/'}${item.get('id')}`} href={item.get('url')} key={item.get('id')} className='mention'>
          @<span>{item.get('username')}</span>
        </Permalink>
      )).reduce((aggregate, item) => [...aggregate, item, ' '], []);

      const toggleText = hidden ? <FormattedMessage id='status.show_more' defaultMessage='Show more' /> : <FormattedMessage id='status.show_less' defaultMessage='Show less' />;

      if (hidden) {
        mentionsPlaceholder = <div>{mentionLinks}</div>;
      }

      return (
        <div className={classNames} ref={this.setRef} tabIndex='0' onMouseDown={this.handleMouseDown} onMouseUp={this.handleMouseUp} onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
          <p style={{ marginBottom: hidden && status.get('mentions').isEmpty() ? '0px' : null }}>
            <span dangerouslySetInnerHTML={spoilerContent} className='translate' />
            {' '}
            <button tabIndex='0' className={`status__content__spoiler-link ${hidden ? 'status__content__spoiler-link--show-more' : 'status__content__spoiler-link--show-less'}`} onClick={this.handleSpoilerClick}>{toggleText}</button>
          </p>

          {mentionsPlaceholder}

          <div tabIndex={!hidden ? 0 : null} className={`status__content__text ${!hidden ? 'status__content__text--visible' : ''} translate`} lang={language} dangerouslySetInnerHTML={content} />

          {!hidden && renderShowPoll && quote ? showPollButton : pollContainer}

          {renderViewThread && showThreadButton}
        </div>
      );
    } else if (this.props.onClick) {
      const output = [
        <div className={classNames} ref={this.setRef} tabIndex='0' onMouseDown={this.handleMouseDown} onMouseUp={this.handleMouseUp} key='status-content' onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
          <div className='status__content__text status__content__text--visible translate' lang={language} dangerouslySetInnerHTML={content} />

          {renderShowPoll && quote ? showPollButton : pollContainer}

          {renderViewThread && showThreadButton}
        </div>,
      ];

      if (renderReadMore) {
        output.push(readMoreButton);
      }

      return output;
    } else {
      return (
        <div className={classNames} ref={this.setRef} tabIndex='0' onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
          <div className='status__content__text status__content__text--visible translate' lang={language} dangerouslySetInnerHTML={content} />

          {renderShowPoll && quote ? showPollButton : pollContainer}

          {renderViewThread && showThreadButton}
        </div>
      );
    }
  }

}
