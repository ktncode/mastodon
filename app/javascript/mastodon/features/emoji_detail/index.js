import React from 'react';
import { connect } from 'react-redux';
import { defineMessages, injectIntl, FormattedMessage, FormattedDate } from 'react-intl';
import ImmutablePropTypes from 'react-immutable-proptypes';
import PropTypes from 'prop-types';
import ScrollableList from '../../components/scrollable_list';
import LoadingIndicator from 'mastodon/components/loading_indicator';
import Column from '../ui/components/column';
import ColumnHeader from 'mastodon/components/column_header';
import Emoji from 'mastodon/components/emoji';
import Icon from 'mastodon/components/icon';
import { fetchCustomEmojiDetail } from 'mastodon/actions/custom_emojis';
import { defaultColumnWidth } from 'mastodon/initial_state';

const messages = defineMessages({
  heading: { id: 'column.custom_emoji_detail', defaultMessage: 'Custom emoji detail' },
  copy_permission_allow: { id: 'copy_permission_none.allow', defaultMessage: 'Allow' },
  copy_permission_deny: { id: 'copy_permission_none.deny', defaultMessage: 'Deny' },
  copy_permission_conditional: { id: 'copy_permission_none.conditional', defaultMessage: 'Conditional' },
  linkToAcct: { id: 'status.link_to_acct', defaultMessage: 'Link to @{acct}' },
  postByAcct: { id: 'status.post_by_acct', defaultMessage: 'Post by @{acct}' },
});

const mapStateToProps = (state, { params: { shortcode_with_domain } }) => ({
  custom_emoji: state.getIn(['custom_emojis_detail', shortcode_with_domain]),
  isLoading: state.getIn(['user_lists', 'custom_emojis_detail', 'isLoading'], true),
  columnWidth: defaultColumnWidth,
});

class EmojiDetailItem extends React.PureComponent {

  static contextTypes = {
    router: PropTypes.object,
  };

  static propTypes = {
    custom_emoji: ImmutablePropTypes.map,
    params: PropTypes.object.isRequired,
    dispatch: PropTypes.func.isRequired,
    intl: PropTypes.object.isRequired,
  };

  state = {
    hovered: false,
  };

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

  handleMouseEnter = () => {
    this.setState({
      hovered: true,
    });
  };

  handleMouseLeave = () => {
    this.setState({
      hovered: false,
    });
  };

  setTargetRef = c => {
    this.target = c;
  };

  setRef = (c) => {
    this.node = c;
  }

  componentDidMount () {
    this._updateLinks();
    this.target?.addEventListener('mouseenter', this.handleMouseEnter, { capture: true });
    this.target?.addEventListener('mouseleave', this.handleMouseLeave, false);
  }

  componentDidUpdate () {
    this._updateLinks();
    this.target?.addEventListener('mouseenter', this.handleMouseEnter, { capture: true });
    this.target?.addEventListener('mouseleave', this.handleMouseLeave, false);
  }

  componentWillUnmount () {
    this.target?.removeEventListener('mouseenter', this.handleMouseEnter, { capture: true });
    this.target?.removeEventListener('mouseleave', this.handleMouseLeave, false);
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
    const { intl, params: { shortcode_with_domain }, custom_emoji } = this.props;

    if (!custom_emoji) {
      return null;
    }

    const shortcode = custom_emoji.get('shortcode');
    const local = custom_emoji.get('local');
    const domain = custom_emoji.get('domain');
    const alternateName = custom_emoji.get('alternate_name');
    const ruby = custom_emoji.get('ruby');
    const aliases = custom_emoji.get('aliases') ?? [];
    const copy_permission = (p => {
      switch (p) {
        case 'allow':
          return intl.formatMessage(messages.copy_permission_allow);
        case 'deny':
          return intl.formatMessage(messages.copy_permission_deny);
        case 'conditional':
          return intl.formatMessage(messages.copy_permission_conditional);
        default:
          return null;
      }
    })(custom_emoji.get('copy_permission'));
    const creator = custom_emoji.get('creator');
    const license = custom_emoji.get('license');
    const copyright_notice = custom_emoji.get('copyright_notice');
    const credit_text = custom_emoji.get('credit_text');
    const usage_info = custom_emoji.get('usage_info');
    const misskey_license = custom_emoji.get('misskey_license');
    const category = custom_emoji.get('category');
    const org_category = custom_emoji.get('org_category');
    const is_based_on = custom_emoji.get('is_based_on');
    const sensitive = custom_emoji.get('sensitive');
    const description = custom_emoji.get('description');
    const related_links = custom_emoji.get('related_links') ?? [];
    const updated_at = custom_emoji.get('updated_at');

    return (
      <div className='custom-emoji__detail' ref={this.setRef}>
        <div className='custom-emoji__image' ref={this.setTargetRef}>
          <Emoji emoji={shortcode_with_domain} hovered={this.state.hovered} domain={domain} url={custom_emoji.get('url')} static_url={custom_emoji.get('static_url')} title={alternateName ?? shortcode} />
        </div>
        <div className='custom-emoji__property'>
          <div className='custom-emoji__label'><FormattedMessage id='search_results.custom_emojis.shortcode' defaultMessage='Short code' /></div>
          <div className='custom-emoji__shortcode'>{shortcode}</div>
        </div>
        <div className='custom-emoji__property'>
          <div className='custom-emoji__label'><FormattedMessage id='search_results.custom_emojis.domain' defaultMessage='Domain' /></div>
          <div className='custom-emoji__domain'>{domain}</div>
        </div>
        {alternateName && <div className='custom-emoji__property'>
          <div className='custom-emoji__label'><FormattedMessage id='search_results.custom_emojis.alternate_name' defaultMessage='Name' /></div>
          <div className='custom-emoji__alternate_name'>{alternateName}</div>
        </div>}
        {ruby && <div className='custom-emoji__property'>
          <div className='custom-emoji__label'><FormattedMessage id='search_results.custom_emojis.ruby' defaultMessage='Reading of name' /></div>
          <div className='custom-emoji__ruby'>{ruby}</div>
        </div>}

        {category && <div className='custom-emoji__property'>
          <div className='custom-emoji__label'><FormattedMessage id='search_results.custom_emojis.category' defaultMessage='Category' /></div>
          <div className='custom-emoji__category category-badge'>{category}</div>
        </div>}
        {local && org_category && <div className='custom-emoji__property'>
          <div className='custom-emoji__label'><FormattedMessage id='search_results.custom_emojis.org_category' defaultMessage='Original category' /></div>
          <div className='custom-emoji__category category-badge'>{org_category}</div>
        </div>}
        {!local && org_category && <div className='custom-emoji__property'>
          <div className='custom-emoji__label'><FormattedMessage id='search_results.custom_emojis.category' defaultMessage='Category' /></div>
          <div className='custom-emoji__category category-badge'>{org_category}</div>
        </div>}

        {creator && <div className='custom-emoji__property'>
          <div className='custom-emoji__label'><FormattedMessage id='search_results.custom_emojis.creator' defaultMessage='Creator' /></div>
          <div className='custom-emoji__creator' dangerouslySetInnerHTML={{ __html: creator }} />
        </div>}
        {license && <div className='custom-emoji__property'>
          <div className='custom-emoji__label'><FormattedMessage id='search_results.custom_emojis.license' defaultMessage='License' /></div>
          <div className='custom-emoji__license' dangerouslySetInnerHTML={{ __html: license }} />
        </div>}
        {copy_permission && <div className='custom-emoji__property'>
          <div className='custom-emoji__label'><FormattedMessage id='search_results.custom_emojis.copy_permission' defaultMessage='Copy permission' /></div>
          <div className='custom-emoji__copy_permission'>{copy_permission}</div>
        </div>}
        {copyright_notice && <div className='custom-emoji__property'>
          <div className='custom-emoji__label'><FormattedMessage id='search_results.custom_emojis.copyright_notice' defaultMessage='Copyright notice' /></div>
          <div className='custom-emoji__copyright_notice' dangerouslySetInnerHTML={{ __html: copyright_notice }} />
        </div>}
        {credit_text && <div className='custom-emoji__property'>
          <div className='custom-emoji__label'><FormattedMessage id='search_results.custom_emojis.credit_text' defaultMessage='Credit text' /></div>
          <div className='custom-emoji__credit_text' dangerouslySetInnerHTML={{ __html: credit_text }} />
        </div>}
        {usage_info && <div className='custom-emoji__property'>
          <div className='custom-emoji__label'><FormattedMessage id='search_results.custom_emojis.usage_info' defaultMessage='Usage Info' /></div>
          <div className='custom-emoji__usage_info' dangerouslySetInnerHTML={{ __html: usage_info }} />
        </div>}
        {is_based_on && <div className='custom-emoji__property'>
          <div className='custom-emoji__label'><FormattedMessage id='search_results.custom_emojis.is_based_on' defaultMessage='Copy from' /></div>
          <div className='custom-emoji__is_based_on'><a href={is_based_on} target='_blank' rel='noopener noreferrer'>{is_based_on}</a></div>
        </div>}
        {sensitive && <div className='custom-emoji__property'>
          <div className='custom-emoji__label'><FormattedMessage id='search_results.custom_emojis.sensitive' defaultMessage='Sensitive' /></div>
          <div className='custom-emoji__sensitive'><Icon id='check' title='✓' /></div>
        </div>}
        {description && <div className='custom-emoji__property'>
          <div className='custom-emoji__label'><FormattedMessage id='search_results.custom_emojis.description' defaultMessage='Description' /></div>
          <div className='custom-emoji__description' dangerouslySetInnerHTML={{ __html: description }} />
        </div>}
        {aliases.size > 0 && <div className='custom-emoji__property'>
          <div className='custom-emoji__label'><FormattedMessage id='search_results.custom_emojis.keyword' defaultMessage='Keyword' /></div>
          {aliases.map(keyword =>
            <div key={keyword} className='custom-emoji__keyword keyword-badge'>{keyword}</div>
          )}
        </div>}
        {related_links.size > 0 && <div className='custom-emoji__property'>
          <div className='custom-emoji__label'><FormattedMessage id='search_results.custom_emojis.related_links' defaultMessage='Related links' /></div>
          {related_links.map(link =>
            <div key={link} className='custom-emoji__related_link' dangerouslySetInnerHTML={{ __html: link }} />
          )}
        </div>}
        {misskey_license && <div className='custom-emoji__property'>
          <div className='custom-emoji__label'><FormattedMessage id='search_results.custom_emojis.misskey_license' defaultMessage='Misskey license' /></div>
          <div className='custom-emoji__misskey_license' dangerouslySetInnerHTML={{ __html: misskey_license }} />
        </div>}
        <div className='custom-emoji__property'>
          <div className='custom-emoji__label'><FormattedMessage id='search_results.custom_emojis.updated_at' defaultMessage='Updated at' /></div>
          <div className='custom-emoji__date'><FormattedDate value={new Date(updated_at)} hour12={false} year='numeric' month='short' day='2-digit' hour='2-digit' minute='2-digit' /></div>
        </div>
      </div>
    );
  }
}

class EmojiDetail extends React.PureComponent {

  static propTypes = {
    params: PropTypes.object.isRequired,
    dispatch: PropTypes.func.isRequired,
    custom_emoji: ImmutablePropTypes.map,
    isLoading: PropTypes.bool,
    intl: PropTypes.object.isRequired,
    multiColumn: PropTypes.bool,
    columnWidth: PropTypes.string,
  };

  componentDidMount () {
    const { custom_emoji, params: { shortcode_with_domain } } = this.props;

    if (!custom_emoji) {
      this.props.dispatch(fetchCustomEmojiDetail(shortcode_with_domain));
    }
  }

  componentDidUpdate (prevProps) {
    const { custom_emoji, params: { shortcode_with_domain } } = this.props;

    if (!custom_emoji && prevProps.params.shortcode_with_domain != shortcode_with_domain) {
      this.props.dispatch(fetchCustomEmojiDetail(shortcode_with_domain));
    }
  }

  handleWidthChange = (value) => {
    const { columnId, dispatch } = this.props;

    if (columnId) {
      dispatch(changeColumnParams(columnId, 'columnWidth', value));
    } else {
      dispatch(changeSetting(['emoji_detail', 'columnWidth'], value));
    }
  }

  render () {
    const { intl, custom_emoji, isLoading, multiColumn, columnWidth } = this.props;

    if (!custom_emoji) {
      if (isLoading) {
        return (
          <Column>
            <LoadingIndicator />
          </Column>
        );
      }
    }

    const scrollableContent = (() => {
      if (!custom_emoji) {
        return null;
      }

      return <EmojiDetailItem {...this.props} />;
    })();

    const emptyMessage = <FormattedMessage id='empty_column.custom_emoji_detail' defaultMessage="There are no matching custom emojis" />;

    return (
      <Column bindToDocument={!multiColumn} label={intl.formatMessage(messages.heading)} columnWidth={columnWidth}>
        <ColumnHeader
          icon='smile-o'
          title={intl.formatMessage(messages.heading)}
          showBackButton
          multiColumn={multiColumn}
          columnWidth={columnWidth}
          onWidthChange={this.handleWidthChange}
        />

        <ScrollableList
          scrollKey='emoji_detail'
          isLoading={isLoading}
          emptyMessage={emptyMessage}
          bindToDocument={!multiColumn}
        >
          {scrollableContent}
        </ScrollableList>
      </Column>
    );
  }

}

export default injectIntl(connect(mapStateToProps)(EmojiDetail));
