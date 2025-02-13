import React from 'react';
import PropTypes from 'prop-types';
import { injectIntl, defineMessages } from 'react-intl';
import { autoPlayGif } from 'mastodon/initial_state';

const messages = defineMessages({
  linkToAcct: { id: 'status.link_to_acct', defaultMessage: 'Link to @{acct}' },
  linkToCustomEmojiInLocal: { id: 'status.link_to_custom_emoji_in_local', defaultMessage: 'Link to :@{shortcode}:' },
  linkToCustomEmojiInRemote: { id: 'status.link_to_custom_emoji_in_remote', defaultMessage: 'Link to :@{shortcode}: in @{domain}' },
  postByAcct: { id: 'status.post_by_acct', defaultMessage: 'Post by @{acct}' },
});

@injectIntl
export default class Content extends React.PureComponent {

  static contextTypes = {
    router: PropTypes.object,
  };

  static propTypes = {
    contentHtml: PropTypes.shape({
      __html: PropTypes.string.isRequired,
    }).isRequired,
    onClick: PropTypes.func,
    className: PropTypes.string,
    intl: PropTypes.object.isRequired,
  };

  _updateEmojiLinks () {
    const node = this.node;

    if (!node) {
      return;
    }

    const emojis = node.querySelectorAll('.custom-emoji');

    for (var i = 0; i < emojis.length; i++) {
      let emoji = emojis[i];
      emoji.addEventListener('click', this.handleEmojiClick, false);
      emoji.style.cursor = 'pointer';
    }
  }

  handleEmojiClick = e => {
    const shortcode = e.target.dataset.shortcode;
    const domain = e.target.dataset.domain;

    if (this.context.router) {
      e.preventDefault();
      e.stopPropagation();
      this.context.router.history.push(`/emoji_detail/${shortcode}${domain ? `@${domain}` : ''}`);
    }
  }

  _updateContentLinks () {
    const { intl } = this.props;
    const node = this.node;

    if (!node) {
      return;
    }

    const links = node.querySelectorAll('a');

    for (var i = 0; i < links.length; ++i) {
      let link = links[i];
      if (link.classList.contains('status-link')) {
        continue;
      }
      link.classList.add('status-link');

      if (link.classList.contains('custom-emoji-url-link') && link.dataset.shortcode) {
        if (link.dataset.domain) {
          link.setAttribute('title', intl.formatMessage(messages.linkToCustomEmojiInRemote, { shortcode: link.dataset.shortcode, domain: link.dataset.domain }));
        } else {
          link.setAttribute('title', intl.formatMessage(messages.linkToCustomEmojiInLocal, { shortcode: link.dataset.shortcode }));
        }
        link.addEventListener('click', this.onCustomEmojiUrlClick.bind(this, link.dataset.shortcode, link.dataset.domain), false);
      } else if ((link.classList.contains('account-url-link') || link.classList.contains('mention')) && link.dataset.accountId) {
        link.setAttribute('title', intl.formatMessage(messages.linkToAcct, { acct: link.dataset.accountAcct }));
        link.addEventListener('click', this.onAccountUrlClick.bind(this, link.dataset.accountId, link.dataset.path ?? '', link.dataset.accountActorType), false);
      } else if (link.classList.contains('status-url-link') && link.dataset.statusId) {
        link.setAttribute('title', intl.formatMessage(messages.postByAcct, { acct: link.dataset.statusAccountAcct }));
        link.addEventListener('click', this.onStatusUrlClick.bind(this, link.dataset.statusId, link.dataset.path ?? ''), false);
      } else if (link.textContent[0] === '#' || (link.previousSibling && link.previousSibling.textContent && link.previousSibling.textContent[link.previousSibling.textContent.length - 1] === '#')) {
        link.addEventListener('click', this.onHashtagClick.bind(this, link.text), false);
      } else {
        link.setAttribute('title', link.href);
        link.classList.add('unhandled-link');
      }

      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
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
    this._updateContentLinks();
    this._updateEmojiLinks();
  }

  componentDidUpdate () {
    this._updateContentLinks();
    this._updateEmojiLinks();
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

  onAccountUrlClick = (accountId, path, accountActorType, e) => {
    if (this.context.router && e.button === 0 && !(e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.context.router.history.push(`${accountActorType == 'Group' ? '/timelines/groups/' : '/accounts/'}${accountId}${path}`);
    }
  }

  onStatusUrlClick = (statusId, path, e) => {
    if (this.context.router && e.button === 0 && !(e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.context.router.history.push(`/statuses/${statusId}${path}`);
    }
  }

  onCustomEmojiUrlClick = (shortcode, domain, e) => {
    if (this.context.router && e.button === 0 && !(e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.context.router.history.push(`/emoji_detail/${shortcode}${domain ? `@${domain}` : ''}`);
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

  setRef = (c) => {
    this.node = c;
  }

  render () {
    if (this.props.onClick) {
      return (
        <span ref={this.setRef} tabIndex='0' onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave} dangerouslySetInnerHTML={this.props.contentHtml}
          onMouseDown={this.handleMouseDown} onMouseUp={this.handleMouseUp} key='content' />
      );
    } else {
      return (
        <span ref={this.setRef} tabIndex='0' onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave} dangerouslySetInnerHTML={this.props.contentHtml} />
      );
    }
  }

}
