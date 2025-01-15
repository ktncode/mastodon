import { connect } from 'react-redux';
import EmojiPickerDropdown from '../components/emoji_picker_dropdown';
import { changeSetting } from '../../../actions/settings';
import { useEmoji } from '../../../actions/emojis';
import { getPickersEmoji, getFrequentlyUsedEmojis } from 'mastodon/selectors';

const mapStateToProps = state => ({
  pickersEmoji: getPickersEmoji(state),
  skinTone: state.getIn(['settings', 'skinTone']),
  frequentlyUsedEmojis: getFrequentlyUsedEmojis(state),
});

const mapDispatchToProps = (dispatch, { onPickEmoji }) => ({
  onSkinTone: skinTone => {
    dispatch(changeSetting(['skinTone'], skinTone));
  },

  onPickEmoji: emoji => {
    dispatch(useEmoji(emoji));

    if (onPickEmoji) {
      onPickEmoji(emoji);
    }
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(EmojiPickerDropdown);
