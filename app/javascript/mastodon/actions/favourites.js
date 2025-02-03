import { fetchRelationshipsSuccess, fetchRelationshipsFromStatuses } from './accounts';
import api, { getLinks } from '../api';
import { importFetchedStatuses, importFetchedAccounts } from './importer';

export const FAVOURITED_STATUSES_FETCH_REQUEST = 'FAVOURITED_STATUSES_FETCH_REQUEST';
export const FAVOURITED_STATUSES_FETCH_SUCCESS = 'FAVOURITED_STATUSES_FETCH_SUCCESS';
export const FAVOURITED_STATUSES_FETCH_FAIL    = 'FAVOURITED_STATUSES_FETCH_FAIL';

export const FAVOURITED_STATUSES_EXPAND_REQUEST = 'FAVOURITED_STATUSES_EXPAND_REQUEST';
export const FAVOURITED_STATUSES_EXPAND_SUCCESS = 'FAVOURITED_STATUSES_EXPAND_SUCCESS';
export const FAVOURITED_STATUSES_EXPAND_FAIL    = 'FAVOURITED_STATUSES_EXPAND_FAIL';

export function fetchFavouritedStatuses({ onlyMedia, withoutMedia } = {}) {
  return (dispatch, getState) => {
    if (getState().getIn(['status_lists', 'favourites', 'isLoading'])) {
      return;
    }

    const params = ['compact=true', onlyMedia ? 'only_media=true' : null, withoutMedia ? 'without_media=true' : null];
    const param_string = params.filter(e => !!e).join('&');

    dispatch(fetchFavouritedStatusesRequest());

    api(getState).get(`/api/v1/favourites?${param_string}`).then(response => {
      const next = getLinks(response).refs.find(link => link.rel === 'next');
      if (response.data) {
        if ('statuses' in response.data && 'accounts' in response.data) {
          const { statuses, referenced_statuses, accounts, relationships } = response.data;
          dispatch(importFetchedAccounts(accounts));
          dispatch(importFetchedStatuses(statuses.concat(referenced_statuses)));
          dispatch(fetchRelationshipsSuccess(relationships));
          dispatch(fetchFavouritedStatusesSuccess(statuses, next ? next.uri : null));
        } else {
          const statuses = response.data;
          dispatch(importFetchedStatuses(statuses));
          dispatch(fetchRelationshipsFromStatuses(statuses));
          dispatch(fetchFavouritedStatusesSuccess(statuses, next ? next.uri : null));
        }
      }
    }).catch(error => {
      dispatch(fetchFavouritedStatusesFail(error));
    });
  };
};

export function fetchFavouritedStatusesRequest() {
  return {
    type: FAVOURITED_STATUSES_FETCH_REQUEST,
    skipLoading: true,
  };
};

export function fetchFavouritedStatusesSuccess(statuses, next) {
  return {
    type: FAVOURITED_STATUSES_FETCH_SUCCESS,
    statuses,
    next,
    skipLoading: true,
  };
};

export function fetchFavouritedStatusesFail(error) {
  return {
    type: FAVOURITED_STATUSES_FETCH_FAIL,
    error,
    skipLoading: true,
  };
};

export function expandFavouritedStatuses() {
  return (dispatch, getState) => {
    const url = getState().getIn(['status_lists', 'favourites', 'next'], null);

    if (url === null || getState().getIn(['status_lists', 'favourites', 'isLoading'])) {
      return;
    }

    dispatch(expandFavouritedStatusesRequest());

    api(getState).get(url).then(response => {
      const next = getLinks(response).refs.find(link => link.rel === 'next');
      if (response.data) {
        if ('statuses' in response.data && 'accounts' in response.data) {
          const { statuses, referenced_statuses, accounts, relationships } = response.data;
          dispatch(importFetchedAccounts(accounts));
          dispatch(importFetchedStatuses(statuses.concat(referenced_statuses)));
          dispatch(fetchRelationshipsSuccess(relationships));
          dispatch(expandFavouritedStatusesSuccess(statuses, next ? next.uri : null));
        } else {
          const statuses = response.data;
          dispatch(importFetchedStatuses(statuses));
          dispatch(fetchRelationshipsFromStatuses(statuses));
          dispatch(expandFavouritedStatusesSuccess(statuses, next ? next.uri : null));
        }
      }
    }).catch(error => {
      dispatch(expandFavouritedStatusesFail(error));
    });
  };
};

export function expandFavouritedStatusesRequest() {
  return {
    type: FAVOURITED_STATUSES_EXPAND_REQUEST,
  };
};

export function expandFavouritedStatusesSuccess(statuses, next) {
  return {
    type: FAVOURITED_STATUSES_EXPAND_SUCCESS,
    statuses,
    next,
  };
};

export function expandFavouritedStatusesFail(error) {
  return {
    type: FAVOURITED_STATUSES_EXPAND_FAIL,
    error,
  };
};
