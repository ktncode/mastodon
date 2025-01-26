import { CUSTOM_EMOJI_DETAIL_IMPORT, CUSTOM_EMOJIS_DETAIL_IMPORT } from '../actions/importer';
import { Map as ImmutableMap, fromJS } from 'immutable';

const initialState = ImmutableMap();

const normalizeCustomEmojiDetail = (state, emoji) => state.set(emoji.shortcode_with_domain, fromJS(emoji));

const normalizeCustomEmojisDetail = (state, emojis) => {
  emojis.forEach(emoji => {
    state = normalizeCustomEmojiDetail(state, emoji);
  });

  return state;
};

export default function custom_emojis_detail(state = initialState, action) {
  switch(action.type) {
  case CUSTOM_EMOJI_DETAIL_IMPORT:
    return normalizeCustomEmojiDetail(state, action.customEmojiDetail);
  case CUSTOM_EMOJIS_DETAIL_IMPORT:
    return normalizeCustomEmojisDetail(state, action.customEmojisDetail);
  default:
    return state;
  }
};
