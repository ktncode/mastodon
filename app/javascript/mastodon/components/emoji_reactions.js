import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import ImmutablePropTypes from 'react-immutable-proptypes';
import ImmutablePureComponent from 'react-immutable-pure-component';
import { List } from 'immutable';
import classNames from 'classnames';
import Emoji from './emoji';
import unicodeMapping from 'mastodon/features/emoji/emoji_unicode_mapping_light';
import AnimatedNumber from 'mastodon/components/animated_number';
import { disableReactions } from 'mastodon/initial_state';
import Overlay from 'react-overlays/lib/Overlay';
import { isUserTouching } from 'mastodon/is_mobile';
import AccountPopup from 'mastodon/components/account_popup';

const getFilteredEmojiReaction = (emojiReaction, relationships) => {
  let filteredEmojiReaction = emojiReaction.update('account_ids', accountIds => accountIds.filterNot( accountId => {
    const relationship = relationships.get(accountId);
    return relationship?.get('blocking') || relationship?.get('blocked_by') || relationship?.get('domain_blocking') || relationship?.get('muting')
  }));

  const count = filteredEmojiReaction.get('account_ids').size;

  if (count > 0) {
    return filteredEmojiReaction.set('count', count);
  } else {
    return null;
  }
};

const mapStateToProps = (state, { emojiReaction }) => {
  const relationship = new Map();
  emojiReaction.get('account_ids').forEach(accountId => relationship.set(accountId, state.getIn(['relationships', accountId])));

  return {
    emojiReaction: emojiReaction,
    relationships: relationship,
  };
};

const mergeProps = ({ emojiReaction, relationships }, dispatchProps, ownProps) => ({
  ...ownProps,
  ...dispatchProps,
  emojiReaction: getFilteredEmojiReaction(emojiReaction, relationships),
});

@connect(mapStateToProps, null, mergeProps)
export default class EmojiReaction extends ImmutablePureComponent {

  static propTypes = {
    status: ImmutablePropTypes.map.isRequired,
    emojiReaction: ImmutablePropTypes.map,
    myReaction: PropTypes.bool.isRequired,
    addEmojiReaction: PropTypes.func.isRequired,
    removeEmojiReaction: PropTypes.func.isRequired,
    style: PropTypes.object,
    reactionLimitReached: PropTypes.bool,
  };

  state = {
    hovered: false,
  };

  handleClick = () => {
    const { emojiReaction, status, addEmojiReaction, removeEmojiReaction, myReaction } = this.props;

    if (myReaction) {
      removeEmojiReaction(status, emojiReaction.get('name'));
    } else {
      addEmojiReaction(status, emojiReaction.get('name'), emojiReaction.get('domain', null), emojiReaction.get('url', null), emojiReaction.get('static_url', null));
    }
  };

  handleMouseEnter = ({ target }) => {
    const { top } = target.getBoundingClientRect();

    this.setState({
      hovered: true,
      placement: top * 2 < innerHeight ? 'bottom' : 'top',
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

  findTarget = () => {
    return this.target;
  };

  componentDidMount () {
    this.target?.addEventListener('mouseenter', this.handleMouseEnter, { capture: true });
    this.target?.addEventListener('mouseleave', this.handleMouseLeave, false);
  }

  componentWillUnmount () {
    this.target?.removeEventListener('mouseenter', this.handleMouseEnter, { capture: true });
    this.target?.removeEventListener('mouseleave', this.handleMouseLeave, false);
  }

  render () {
    const { style, emojiReaction, myReaction, reactionLimitReached } = this.props;

    if (!emojiReaction) {
      return <Fragment />;
    }

    let shortCode = emojiReaction.get('name');

    if (unicodeMapping[shortCode]) {
      shortCode = unicodeMapping[shortCode].shortCode;
    }

    return (
      <Fragment>
        <div className='reactions-bar__item-wrapper' ref={this.setTargetRef}>
          <button className={classNames('reactions-bar__item', { active: myReaction })} disabled={disableReactions || !myReaction && reactionLimitReached} onClick={this.handleClick} title={`:${shortCode}:`} style={style}>
            <span className='reactions-bar__item__emoji'><Emoji className='reaction' hovered={this.state.hovered} emoji={emojiReaction.get('name')} url={emojiReaction.get('url')} static_url={emojiReaction.get('static_url')} /></span>
            <span className='reactions-bar__item__count'><AnimatedNumber value={emojiReaction.get('count')} /></span>
          </button>
        </div>
        {!isUserTouching() &&
        <Overlay show={this.state.hovered} placement={this.state.placement} target={this.findTarget}>
          <AccountPopup accountIds={emojiReaction.get('account_ids', List())} />
        </Overlay>
        }
      </Fragment>
    );
  };

}
