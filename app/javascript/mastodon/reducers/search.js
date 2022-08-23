import { STORE_HYDRATE } from '../actions/store';
import {
  SEARCH_CHANGE,
  SEARCH_CLEAR,
  SEARCH_FETCH_SUCCESS,
  SEARCH_SHOW,
  SEARCH_EXPAND_SUCCESS,
} from '../actions/search';
import {
  COMPOSE_MENTION,
  COMPOSE_REPLY,
  COMPOSE_DIRECT,
  COMPOSE_QUOTE,
} from '../actions/compose';
import { Map as ImmutableMap, List as ImmutableList, fromJS } from 'immutable';

const initialState = ImmutableMap({
  value: '',
  submitted: false,
  hidden: false,
  results: ImmutableMap(),
  searchTerm: '',
  searchability: 'private',
  default_searchability: 'private',
});

export default function search(state = initialState, action) {
  switch(action.type) {
  case STORE_HYDRATE:
    const default_searchability = action.state.getIn(['search', 'default_searchability']);

    if (default_searchability) {
      return state.withMutations(map => {
        map.set('searchability', default_searchability);
        map.set('default_searchability', default_searchability);
      });
    }

    return state;
  case SEARCH_CHANGE:
    return state.set('value', action.value);
  case SEARCH_CLEAR:
    return state.withMutations(map => {
      map.set('value', '');
      map.set('results', ImmutableMap());
      map.set('submitted', false);
      map.set('hidden', false);
      map.set('searchability', state.get('default_searchability'));
    });
  case SEARCH_SHOW:
    return state.set('hidden', false);
  case COMPOSE_REPLY:
  case COMPOSE_MENTION:
  case COMPOSE_DIRECT:
  case COMPOSE_QUOTE:
    return state.set('hidden', true);
  case SEARCH_FETCH_SUCCESS:
    return state.set('results', ImmutableMap({
      accounts: ImmutableList(action.results.accounts.map(item => item.id)),
      statuses: ImmutableList(action.results.statuses.map(item => item.id)),
      hashtags: fromJS(action.results.hashtags),
      profiles: ImmutableList(action.results.profiles.map(item => item.id)),
    })).set('submitted', true).set('searchTerm', action.searchTerm);
  case SEARCH_EXPAND_SUCCESS:
    const results = action.searchType === 'hashtags' ? fromJS(action.results.hashtags) : action.results[action.searchType].map(item => item.id);
    return state.updateIn(['results', action.searchType], list => list.concat(results));
  default:
    return state;
  }
};
