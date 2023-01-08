import {
  SCHEDULED_STATUSES_FETCH_REQUEST,
  SCHEDULED_STATUSES_FETCH_SUCCESS,
  SCHEDULED_STATUSES_FETCH_FAIL,
  SCHEDULED_STATUSES_EXPAND_REQUEST,
  SCHEDULED_STATUSES_EXPAND_SUCCESS,
  SCHEDULED_STATUSES_EXPAND_FAIL,
  SCHEDULED_STATUS_DELETE_SUCCESS,
} from '../actions/scheduled_statuses';
import {
  SCHEDULED_STATUS_SUBMIT_SUCCESS,
} from '../actions/compose';
import { Map as ImmutableMap, List as ImmutableList, fromJS } from 'immutable';

const initialState = ImmutableMap({
  next: null,
  loaded: false,
  isLoading: false,
  items: ImmutableList(),
});

const normalizeList = (state, scheduled_statuses, next) => {
  return state.withMutations(map => {
    map.set('next', next);
    map.set('loaded', true);
    map.set('isLoading', false);
    map.set('items', fromJS(scheduled_statuses));
  });
};

const appendToList = (state, scheduled_statuses, next) => {
  return state.withMutations(map => {
    map.set('next', next);
    map.set('isLoading', false);
    map.set('items', map.get('items').concat(fromJS(scheduled_statuses)));
  });
};

const prependOneToList = (state, scheduled_status) => {
  return state.withMutations(map => {
    map.set('items', map.get('items').unshift(fromJS(scheduled_status)));
  });
};

const removeOneFromList = (state, id) => {
  return state.withMutations(map => {
    map.set('items', map.get('items').filter(item => item.get('id') !== id));
  });
};

export default function statusLists(state = initialState, action) {
  switch(action.type) {
  case SCHEDULED_STATUSES_FETCH_REQUEST:
  case SCHEDULED_STATUSES_EXPAND_REQUEST:
    return state.set('isLoading', true);
  case SCHEDULED_STATUSES_FETCH_FAIL:
  case SCHEDULED_STATUSES_EXPAND_FAIL:
    return state.set('isLoading', false);
  case SCHEDULED_STATUSES_FETCH_SUCCESS:
    return normalizeList(state, action.scheduled_statuses, action.next);
  case SCHEDULED_STATUSES_EXPAND_SUCCESS:
    return appendToList(state, action.scheduled_statuses, action.next);
  case SCHEDULED_STATUS_SUBMIT_SUCCESS:
    return prependOneToList(state, action.scheduled_status);
  case SCHEDULED_STATUS_DELETE_SUCCESS:
    return removeOneFromList(state, action.id);
  default:
    return state;
  }
};
