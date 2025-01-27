import api from '../api';
import {
  importFetchedCustomEmojiDetail,
} from './importer';

export const CUSTOM_EMOJIS_FETCH_REQUEST = 'CUSTOM_EMOJIS_FETCH_REQUEST';
export const CUSTOM_EMOJIS_FETCH_SUCCESS = 'CUSTOM_EMOJIS_FETCH_SUCCESS';
export const CUSTOM_EMOJIS_FETCH_FAIL = 'CUSTOM_EMOJIS_FETCH_FAIL';
export const CUSTOM_EMOJI_DETAIL_FETCH_REQUEST = 'CUSTOM_EMOJI_DETAIL_FETCH_REQUEST';
export const CUSTOM_EMOJI_DETAIL_FETCH_SUCCESS = 'CUSTOM_EMOJI_DETAIL_FETCH_SUCCESS';
export const CUSTOM_EMOJI_DETAIL_FETCH_FAIL = 'CUSTOM_EMOJI_DETAIL_FETCH_FAIL';

export function fetchCustomEmojis() {
  return (dispatch, getState) => {
    dispatch(fetchCustomEmojisRequest());

    api(getState).get('/api/v1/custom_emojis').then(response => {
      dispatch(fetchCustomEmojisSuccess(response.data));
    }).catch(error => {
      dispatch(fetchCustomEmojisFail(error));
    });
  };
};

export function fetchCustomEmojisRequest() {
  return {
    type: CUSTOM_EMOJIS_FETCH_REQUEST,
    skipLoading: true,
  };
};

export function fetchCustomEmojisSuccess(custom_emojis) {
  return {
    type: CUSTOM_EMOJIS_FETCH_SUCCESS,
    custom_emojis,
    skipLoading: true,
  };
};

export function fetchCustomEmojisFail(error) {
  return {
    type: CUSTOM_EMOJIS_FETCH_FAIL,
    error,
    skipLoading: true,
  };
};

export function fetchCustomEmojiDetail(shortcode_with_domain) {
  return (dispatch, getState) => {
    dispatch(fetchCustomEmojiDetailRequest());

    api(getState).get(`/api/v1/custom_emojis/${shortcode_with_domain}`).then(response => {
      dispatch(importFetchedCustomEmojiDetail(response.data));
      dispatch(fetchCustomEmojiDetailSuccess(response.data));
    }).catch(error => {
      dispatch(fetchCustomEmojiDetailFail(error));
    });
  };
}

export function fetchCustomEmojiDetailRequest() {
  return {
    type: CUSTOM_EMOJI_DETAIL_FETCH_REQUEST,
    skipLoading: true,
  };
};

export function fetchCustomEmojiDetailSuccess(custom_emojis) {
  return {
    type: CUSTOM_EMOJI_DETAIL_FETCH_SUCCESS,
    custom_emojis,
    skipLoading: true,
  };
};

export function fetchCustomEmojiDetailFail(error) {
  return {
    type: CUSTOM_EMOJI_DETAIL_FETCH_FAIL,
    error,
    skipLoading: true,
  };
};

