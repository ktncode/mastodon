import api from '../api';
import { fetchRelationshipsSuccess, fetchRelationships } from './accounts';
import { importFetchedAccounts, importFetchedStatuses } from './importer';

export const SEARCH_CHANGE = 'SEARCH_CHANGE';
export const SEARCH_CLEAR  = 'SEARCH_CLEAR';
export const SEARCH_SHOW   = 'SEARCH_SHOW';

export const SEARCH_FETCH_REQUEST = 'SEARCH_FETCH_REQUEST';
export const SEARCH_FETCH_SUCCESS = 'SEARCH_FETCH_SUCCESS';
export const SEARCH_FETCH_FAIL    = 'SEARCH_FETCH_FAIL';

export const SEARCH_EXPAND_REQUEST = 'SEARCH_EXPAND_REQUEST';
export const SEARCH_EXPAND_SUCCESS = 'SEARCH_EXPAND_SUCCESS';
export const SEARCH_EXPAND_FAIL    = 'SEARCH_EXPAND_FAIL';

export function changeSearch(value) {
  return {
    type: SEARCH_CHANGE,
    value,
  };
};

export function clearSearch() {
  return {
    type: SEARCH_CLEAR,
  };
};

export function submitSearch() {
  return (dispatch, getState) => {
    const value = getState().getIn(['search', 'value']);

    if (value.length === 0) {
      dispatch(fetchSearchSuccess({ accounts: [], statuses: [], hashtags: [], profiles: [] }, ''));
      return;
    }

    dispatch(fetchSearchRequest());

    api(getState).get('/api/v2/search', {
      params: {
        q: value,
        resolve: true,
        limit: 11,
        with_profiles: true,
        compact: true,
      },
    }).then(response => {
      if (response.data.accounts) {
        dispatch(importFetchedAccounts(response.data.accounts));
      }

      if (response.data.profiles) {
        dispatch(importFetchedAccounts(response.data.profiles));
      }

      if (response.data.statuses) {
        if (response.data.statuses.statuses && response.data.statuses.accounts) {
          const { statuses, referenced_statuses, accounts, relationships } = response.data.statuses;
          response.data.statuses = statuses;
          dispatch(importFetchedStatuses(statuses.concat(referenced_statuses)));
          dispatch(importFetchedAccounts(accounts));
          dispatch(fetchRelationshipsSuccess(relationships));
        } else {
          dispatch(importFetchedStatuses(response.data.statuses));
        }
      }

      dispatch(fetchSearchSuccess(response.data, value));
      dispatch(fetchRelationships(response.data.accounts.map(item => item.id)));
      dispatch(fetchRelationships(response.data.profiles.map(item => item.id)));
    }).catch(error => {
      dispatch(fetchSearchFail(error));
    });
  };
};

export function fetchSearchRequest() {
  return {
    type: SEARCH_FETCH_REQUEST,
  };
};

export function fetchSearchSuccess(results, searchTerm) {
  return {
    type: SEARCH_FETCH_SUCCESS,
    results,
    searchTerm,
  };
};

export function fetchSearchFail(error) {
  return {
    type: SEARCH_FETCH_FAIL,
    error,
  };
};

export const expandSearch = type => (dispatch, getState) => {
  const value  = getState().getIn(['search', 'value']);
  const result = getState().getIn(['search', 'results', type]);
  const params = {
    q: value,
    type,
    limit: 11,
    with_profiles: true,
    compact: true,
  };

  if (type == 'statuses') {
    if (result.isEmpty() || result.first() >= result.last()) {
      params.max_id = result.last();
    } else {
      params.min_id = result.last();
    }
  } else {
    params.offset = result.size - 1;
  }

  dispatch(expandSearchRequest());

  api(getState).get('/api/v2/search', { params }).then(({ data }) => {
    if (data.accounts) {
      dispatch(importFetchedAccounts(data.accounts));
    }

    if (data.profiles) {
      dispatch(importFetchedAccounts(data.profiles));
    }

    if (data.statuses) {
      if (data.statuses.statuses && data.statuses.accounts) {
        const { statuses, referenced_statuses, accounts, relationships } = data.statuses;
        data.statuses = statuses;
        dispatch(importFetchedStatuses(statuses.concat(referenced_statuses)));
        dispatch(importFetchedAccounts(accounts));
        dispatch(fetchRelationshipsSuccess(relationships));
      } else {
        dispatch(importFetchedStatuses(data.statuses));
      }
    }

    dispatch(expandSearchSuccess(data, value, type));
    dispatch(fetchRelationships(data.accounts.map(item => item.id)));
    dispatch(fetchRelationships(data.profiles.map(item => item.id)));
  }).catch(error => {
    dispatch(expandSearchFail(error));
  });
};

export const expandSearchRequest = () => ({
  type: SEARCH_EXPAND_REQUEST,
});

export const expandSearchSuccess = (results, searchTerm, searchType) => ({
  type: SEARCH_EXPAND_SUCCESS,
  results,
  searchTerm,
  searchType,
});

export const expandSearchFail = error => ({
  type: SEARCH_EXPAND_FAIL,
  error,
});

export const showSearch = () => ({
  type: SEARCH_SHOW,
});
