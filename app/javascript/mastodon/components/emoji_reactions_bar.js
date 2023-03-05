import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import ImmutablePropTypes from 'react-immutable-proptypes';
import ImmutablePureComponent from 'react-immutable-pure-component';
import { List } from 'immutable';
import TransitionMotion from 'react-motion/lib/TransitionMotion';
import { reduceMotion, me } from 'mastodon/initial_state';
import spring from 'react-motion/lib/spring';
import EmojiReaction from './emoji_reactions';

const mapStateToProps = (state, { status }) => ({
  emojiReactions: status.get('emoji_reactions'),
});

const mergeProps = ({ emojiReactions }, dispatchProps, ownProps) => ({
  ...ownProps,
  ...dispatchProps,
  visibleReactions: emojiReactions.filter(x => x.get('count') > 0),
});

@connect(mapStateToProps, null, mergeProps)
export default class EmojiReactionsBar extends ImmutablePureComponent {

  static propTypes = {
    status: ImmutablePropTypes.map.isRequired,
    addEmojiReaction: PropTypes.func.isRequired,
    removeEmojiReaction: PropTypes.func.isRequired,
    visibleReactions: ImmutablePropTypes.list.isRequired,
    reactionLimitReached: PropTypes.bool,
  };

  willEnter () {
    return { scale: reduceMotion ? 1 : 0 };
  }

  willLeave () {
    return { scale: reduceMotion ? 0 : spring(0, { stiffness: 170, damping: 26 }) };
  }

  render () {
    const { status, addEmojiReaction, removeEmojiReaction, visibleReactions, reactionLimitReached } = this.props;

    if (visibleReactions.isEmpty() ) {
      return <Fragment />;
    }

    const styles = visibleReactions.map(emojiReaction => {
      const domain = emojiReaction.get('domain', '');

      return {
        key: `${emojiReaction.get('name')}${domain ? `@${domain}` : ''}`,
        data: {
          emojiReaction: emojiReaction,
          myReaction: emojiReaction.get('account_ids', List()).includes(me),
        },
        style: { scale: reduceMotion ? 1 : spring(1, { stiffness: 150, damping: 13 }) },
      };
    }).toArray();

    return (
      <TransitionMotion styles={styles} willEnter={this.willEnter} willLeave={this.willLeave}>
        {items => (
          <div className='reactions-bar emoji-reactions-bar'>
            {items.map(({ key, data, style }) => (
              <EmojiReaction
                key={key}
                emojiReaction={data.emojiReaction}
                myReaction={data.myReaction}
                style={{ transform: `scale(${style.scale})`, position: style.scale < 0.5 ? 'absolute' : 'static' }}
                status={status}
                addEmojiReaction={addEmojiReaction}
                removeEmojiReaction={removeEmojiReaction}
                reactionLimitReached={reactionLimitReached}
              />
            ))}
          </div>
        )}
      </TransitionMotion>
    );
  }

}
