import { fetchRelationshipsSuccess, fetchRelationshipsFromStatuses } from './accounts';
import api, { getLinks } from '../api';
import { importFetchedStatuses, importFetchedAccounts } from './importer';

export const BOOKMARKED_STATUSES_FETCH_REQUEST = 'BOOKMARKED_STATUSES_FETCH_REQUEST';
export const BOOKMARKED_STATUSES_FETCH_SUCCESS = 'BOOKMARKED_STATUSES_FETCH_SUCCESS';
export const BOOKMARKED_STATUSES_FETCH_FAIL    = 'BOOKMARKED_STATUSES_FETCH_FAIL';

export const BOOKMARKED_STATUSES_EXPAND_REQUEST = 'BOOKMARKED_STATUSES_EXPAND_REQUEST';
export const BOOKMARKED_STATUSES_EXPAND_SUCCESS = 'BOOKMARKED_STATUSES_EXPAND_SUCCESS';
export const BOOKMARKED_STATUSES_EXPAND_FAIL    = 'BOOKMARKED_STATUSES_EXPAND_FAIL';

export function fetchBookmarkedStatuses({ onlyMedia, withoutMedia } = {}) {
  return (dispatch, getState) => {
    if (getState().getIn(['status_lists', 'bookmarks', 'isLoading'])) {
      return;
    }

    const params = ['compact=true', onlyMedia ? 'only_media=true' : null, withoutMedia ? 'without_media=true' : null];
    const param_string = params.filter(e => !!e).join('&');

    dispatch(fetchBookmarkedStatusesRequest());

    api(getState).get(`/api/v1/bookmarks?${param_string}`).then(response => {
      const next = getLinks(response).refs.find(link => link.rel === 'next');
      if (response.data) {
        if ('statuses' in response.data && 'accounts' in response.data) {
          const { statuses, referenced_statuses, accounts, relationships } = response.data;
          dispatch(importFetchedStatuses(statuses.concat(referenced_statuses)));
          dispatch(importFetchedAccounts(accounts));
          dispatch(fetchRelationshipsSuccess(relationships));
          dispatch(fetchBookmarkedStatusesSuccess(statuses, next ? next.uri : null));
        } else {
          const statuses = response.data;
          dispatch(importFetchedStatuses(statuses));
          dispatch(fetchRelationshipsFromStatuses(statuses));
          dispatch(fetchBookmarkedStatusesSuccess(statuses, next ? next.uri : null));
        }
      }
    }).catch(error => {
      dispatch(fetchBookmarkedStatusesFail(error));
    });
  };
};

export function fetchBookmarkedStatusesRequest() {
  return {
    type: BOOKMARKED_STATUSES_FETCH_REQUEST,
  };
};

export function fetchBookmarkedStatusesSuccess(statuses, next) {
  return {
    type: BOOKMARKED_STATUSES_FETCH_SUCCESS,
    statuses,
    next,
  };
};

export function fetchBookmarkedStatusesFail(error) {
  return {
    type: BOOKMARKED_STATUSES_FETCH_FAIL,
    error,
  };
};

export function expandBookmarkedStatuses() {
  return (dispatch, getState) => {
    const url = getState().getIn(['status_lists', 'bookmarks', 'next'], null);

    if (url === null || getState().getIn(['status_lists', 'bookmarks', 'isLoading'])) {
      return;
    }

    dispatch(expandBookmarkedStatusesRequest());

    api(getState).get(url).then(response => {
      const next = getLinks(response).refs.find(link => link.rel === 'next');
      if (response.data) {
        if ('statuses' in response.data && 'accounts' in response.data) {
          const { statuses, referenced_statuses, accounts, relationships } = response.data;
          dispatch(importFetchedStatuses(statuses.concat(referenced_statuses)));
          dispatch(importFetchedAccounts(accounts));
          dispatch(fetchRelationshipsSuccess(relationships));
          dispatch(expandBookmarkedStatusesSuccess(statuses, next ? next.uri : null));
        } else {
          const statuses = response.data;
          dispatch(importFetchedStatuses(statuses));
          dispatch(fetchRelationshipsFromStatuses(statuses));
          dispatch(expandBookmarkedStatusesSuccess(statuses, next ? next.uri : null));
        }
      }
    }).catch(error => {
      dispatch(expandBookmarkedStatusesFail(error));
    });
  };
};

export function expandBookmarkedStatusesRequest() {
  return {
    type: BOOKMARKED_STATUSES_EXPAND_REQUEST,
  };
};

export function expandBookmarkedStatusesSuccess(statuses, next) {
  return {
    type: BOOKMARKED_STATUSES_EXPAND_SUCCESS,
    statuses,
    next,
  };
};

export function expandBookmarkedStatusesFail(error) {
  return {
    type: BOOKMARKED_STATUSES_EXPAND_FAIL,
    error,
  };
};
