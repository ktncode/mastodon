// @ts-check
import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { injectIntl, defineMessages, FormattedMessage } from 'react-intl';
import Emoji from './emoji';

const messages = defineMessages({
  linkToAcct: { id: 'status.link_to_acct', defaultMessage: 'Link to @{acct}' },
  postByAcct: { id: 'status.post_by_acct', defaultMessage: 'Post by @{acct}' },
});

const mapStateToProps = (state, { shortcode_with_domain }) => ({
  custom_emoji: state.getIn(['custom_emojis_detail', shortcode_with_domain]),
});

class CustomEmojiResult extends React.PureComponent {

  static contextTypes = {
    router: PropTypes.object,
  };

  static propTypes = {
    shortcode_with_domain: PropTypes.string.isRequired,
    custom_emoji: ImmutablePropTypes.map.isRequired,
    intl: PropTypes.object.isRequired,
  };

  state = {
    hovered: false,
  };

  handleEmojiClick = e => {
    const shortcode = e.target.dataset.shortcode;
    const domain = e.target.dataset.domain;

    if (this.context.router) {
      e.preventDefault();
      e.stopPropagation();
      this.context.router.history.push(`/emoji_detail/${shortcode}${domain ? `@${domain}` : ''}`);
    }
  }

  handleMouseEnter = () => this.setState({ hovered: true });
  handleMouseLeave = () => this.setState({ hovered: false });

  _updateLinks () {
    const { intl } = this.props;
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

      if (link.textContent[0] === '#' || (link.previousSibling && link.previousSibling.textContent && link.previousSibling.textContent[link.previousSibling.textContent.length - 1] === '#')) {
        link.addEventListener('click', this.onHashtagClick.bind(this, link.text), false);
      } else if (link.classList.contains('account-url-link')) {
        link.setAttribute('title', intl.formatMessage(messages.linkToAcct, { acct: link.dataset.accountAcct }));
        link.addEventListener('click', this.onAccountUrlClick.bind(this, link.dataset.accountId, link.dataset.accountActorType), false);
      } else if (link.classList.contains('status-url-link')) {
        link.setAttribute('title', intl.formatMessage(messages.postByAcct, { acct: link.dataset.statusAccountAcct }));
        link.addEventListener('click', this.onStatusUrlClick.bind(this, link.dataset.statusId), false);
      } else {
        link.setAttribute('title', link.href);
        link.classList.add('unhandled-link');
      }

      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    }
  }

  setRef = (c) => {
    this.node = c;
  }

  componentDidMount () {
    this._updateLinks();
  }

  componentDidUpdate () {
    this._updateLinks();
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

  onReferenceLinkClick = (statusId, e) => {
    if (this.context.router && e.button === 0 && !(e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.context.router.history.push(`/statuses/${statusId}/references`);
    }
  }

  render () {
    const { custom_emoji } = this.props;

    if (!custom_emoji) {
      return null;
    }

    const shortcode = custom_emoji.get('shortcode');
    const domain = custom_emoji.get('domain');    
    const title = custom_emoji.get('alternate_name') ?? shortcode;
    const summary = custom_emoji.get('summary') ?? custom_emoji.get('misskey_license');

    return (
      <div className='custom-emoji__result'>
        <div className='custom-emoji__image' onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
          <Emoji emoji={shortcode} domain={domain} hovered={this.state.hovered} title={title} url={custom_emoji.get('url')} static_url={custom_emoji.get('static_url')} onClick={this.handleEmojiClick}/>
        </div>
        <div className='custom-emoji__shortcode'>:{shortcode}:{domain && <span className='custom-emoji__domain_part'>{domain}</span>}</div>
        {summary && 
          <div className='custom-emoji__summary_wrapper' ref={this.setRef}>
            <div className='custom-emoji__label'><FormattedMessage id='search_results.custom_emojis.summary' defaultMessage='License summary' /></div>
            <div className='custom-emoji__summary' dangerouslySetInnerHTML={{ __html: summary}} />
          </div>
        }
      </div>
    );
  
  }

}

export default injectIntl(connect(mapStateToProps)(CustomEmojiResult));
