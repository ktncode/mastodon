import { connect } from 'react-redux';
import EmojiPickerDropdown from '../components/emoji_picker_dropdown';
import { openModal, closeModal } from 'mastodon/actions/modal';
import { openDropdownMenu, closeDropdownMenu } from 'mastodon/actions/dropdown_menu';
import { changeSetting } from 'mastodon/actions/settings';
import { useEmoji } from 'mastodon/actions/emojis';
import { getPickersEmoji, getFrequentlyUsedEmojis } from 'mastodon/selectors';
import { isUserTouching } from 'mastodon/is_mobile';

const mapStateToProps = state => ({
  pickersEmoji: getPickersEmoji(state),
  skinTone: state.getIn(['settings', 'skinTone']),
  openDropdownId: state.getIn(['dropdown_menu', 'openId']),
  frequentlyUsedEmojis: getFrequentlyUsedEmojis(state),
});

const mapDispatchToProps = (dispatch, { onPickEmoji, scrollKey }) => ({
  onSkinTone: skinTone => {
    dispatch(changeSetting(['skinTone'], skinTone));
  },

  onPickEmoji: emoji => {
    dispatch(useEmoji(emoji));

    if (onPickEmoji) {
      onPickEmoji(emoji);
    }
  },

  onOpen(id, keyboard) {
    dispatch((_, getState) => {
      let state = getState();

      dispatch(isUserTouching() ? openModal('REACTION', {
        onPickEmoji: onPickEmoji,
        onSkinTone: skinTone => {
          dispatch(changeSetting(['skinTone'], skinTone));
        },
        pickersEmoji: getPickersEmoji(state),
        frequentlyUsedEmojis: getFrequentlyUsedEmojis(state),
      }) : openDropdownMenu(id, keyboard, scrollKey));
    });
  },

  onClose(id) {
    dispatch(closeModal('REACTION'));
    dispatch(closeDropdownMenu(id));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(EmojiPickerDropdown);
