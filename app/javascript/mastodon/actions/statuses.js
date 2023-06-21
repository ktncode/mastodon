import api from '../api';

import { deleteFromTimelines } from './timelines';
import { fetchRelationshipsFromStatus, fetchRelationshipsFromStatuses } from './accounts';
import { importFetchedStatus, importFetchedStatuses, importFetchedAccount } from './importer';
import { ensureComposeIsVisible, getContextReference } from './compose';

export const STATUS_FETCH_REQUEST = 'STATUS_FETCH_REQUEST';
export const STATUS_FETCH_SUCCESS = 'STATUS_FETCH_SUCCESS';
export const STATUS_FETCH_FAIL    = 'STATUS_FETCH_FAIL';

export const STATUSES_FETCH_REQUEST = 'STATUSES_FETCH_REQUEST';
export const STATUSES_FETCH_SUCCESS = 'STATUSES_FETCH_SUCCESS';
export const STATUSES_FETCH_FAIL    = 'STATUSES_FETCH_FAIL';

export const STATUS_DELETE_REQUEST = 'STATUS_DELETE_REQUEST';
export const STATUS_DELETE_SUCCESS = 'STATUS_DELETE_SUCCESS';
export const STATUS_DELETE_FAIL    = 'STATUS_DELETE_FAIL';

export const CONTEXT_FETCH_REQUEST = 'CONTEXT_FETCH_REQUEST';
export const CONTEXT_FETCH_SUCCESS = 'CONTEXT_FETCH_SUCCESS';
export const CONTEXT_FETCH_FAIL    = 'CONTEXT_FETCH_FAIL';

export const STATUS_MUTE_REQUEST = 'STATUS_MUTE_REQUEST';
export const STATUS_MUTE_SUCCESS = 'STATUS_MUTE_SUCCESS';
export const STATUS_MUTE_FAIL    = 'STATUS_MUTE_FAIL';

export const STATUS_UNMUTE_REQUEST = 'STATUS_UNMUTE_REQUEST';
export const STATUS_UNMUTE_SUCCESS = 'STATUS_UNMUTE_SUCCESS';
export const STATUS_UNMUTE_FAIL    = 'STATUS_UNMUTE_FAIL';

export const STATUS_REVEAL   = 'STATUS_REVEAL';
export const STATUS_HIDE     = 'STATUS_HIDE';
export const STATUS_COLLAPSE = 'STATUS_COLLAPSE';

export const REDRAFT = 'REDRAFT';

export function fetchStatusRequest(id, skipLoading) {
  return {
    type: STATUS_FETCH_REQUEST,
    id,
    skipLoading,
  };
};

export function fetchStatus(id) {
  return (dispatch, getState) => {
    const skipLoading = getState().getIn(['statuses', id], null) !== null;

    dispatch(fetchContext(id));

    if (skipLoading) {
      return;
    }

    dispatch(fetchStatusRequest(id, skipLoading));

    api(getState).get(`/api/v1/statuses/${id}`).then(response => {
      const status = response.data;
      dispatch(importFetchedStatus(status));
      dispatch(fetchRelationshipsFromStatus(status));
      dispatch(fetchStatusSuccess(skipLoading));
    }).catch(error => {
      dispatch(fetchStatusFail(id, error, skipLoading));
    });
  };
};

export function fetchStatusSuccess(skipLoading) {
  return {
    type: STATUS_FETCH_SUCCESS,
    skipLoading,
  };
};

export function fetchStatusFail(id, error, skipLoading) {
  return {
    type: STATUS_FETCH_FAIL,
    id,
    error,
    skipLoading,
    skipAlert: true,
  };
};

export function fetchStatusesRequest(ids) {
  return {
    type: STATUSES_FETCH_REQUEST,
    ids,
  };
};

export function fetchStatuses(ids) {
  return (dispatch, getState) => {
    const loadedStatuses = getState().get('statuses', new Map());
    const newStatusIds = Array.from(new Set(ids)).filter(id => loadedStatuses.get(id, null) === null);

    if (newStatusIds.length === 0) {
      return;
    }

    dispatch(fetchStatusesRequest(newStatusIds));

    api(getState).get(`/api/v1/statuses?${newStatusIds.map(id => `ids[]=${id}`).join('&')}`).then(response => {
      const statuses = response.data;
      dispatch(importFetchedStatuses(statuses));
      dispatch(fetchRelationshipsFromStatuses(statuses));
      dispatch(fetchStatusesSuccess());
    }).catch(error => {
      dispatch(fetchStatusesFail(newStatusIds, error));
    });
  };
};

export function fetchStatusesSuccess() {
  return {
    type: STATUSES_FETCH_SUCCESS,
  };
};

export function fetchStatusesFail(ids, error) {
  return {
    type: STATUSES_FETCH_FAIL,
    ids,
    error,
    skipAlert: true,
  };
};

export function redraft(getState, status, replyStatus, raw_text) {
  return {
    type: REDRAFT,
    status,
    replyStatus,
    raw_text,
    context_references: getContextReference(getState, replyStatus),
  };
};

export function deleteStatus(id, routerHistory, withRedraft = false) {
  return (dispatch, getState) => {
    const status = getState().getIn(['statuses', id]).update('poll', poll => poll ? getState().getIn(['polls', poll]) : null);
    const replyStatus = status.get('in_reply_to_id') ? getState().getIn(['statuses', status.get('in_reply_to_id')]).update('account', account => getState().getIn(['accounts', account])) : null;

    dispatch(deleteStatusRequest(id));

    api(getState).delete(`/api/v1/statuses/${id}`).then(response => {
      dispatch(deleteStatusSuccess(id));
      dispatch(deleteFromTimelines(id));
      dispatch(importFetchedAccount(response.data.account));

      if (withRedraft) {
        dispatch(fetchStatuses(status.get('status_reference_ids', [])));
        dispatch(redraft(getState, status, replyStatus, response.data.text));
        ensureComposeIsVisible(getState, routerHistory);
      }
    }).catch(error => {
      dispatch(deleteStatusFail(id, error));
    });
  };
};

export function deleteStatusRequest(id) {
  return {
    type: STATUS_DELETE_REQUEST,
    id: id,
  };
};

export function deleteStatusSuccess(id) {
  return {
    type: STATUS_DELETE_SUCCESS,
    id: id,
  };
};

export function deleteStatusFail(id, error) {
  return {
    type: STATUS_DELETE_FAIL,
    id: id,
    error: error,
  };
};

export function fetchContext(id) {
  return (dispatch, getState) => {
    dispatch(fetchContextRequest(id));

    api(getState).get(`/api/v1/statuses/${id}/context`, { params: { with_reference: true } }).then(response => {
      const statuses = response.data.ancestors.concat(response.data.descendants).concat(response.data.references);
      dispatch(importFetchedStatuses(statuses));
      dispatch(fetchRelationshipsFromStatuses(statuses));
      dispatch(fetchContextSuccess(id, response.data.ancestors, response.data.descendants, response.data.references));

    }).catch(error => {
      if (error.response && error.response.status === 404) {
        dispatch(deleteFromTimelines(id));
      }

      dispatch(fetchContextFail(id, error));
    });
  };
};

export function fetchContextRequest(id) {
  return {
    type: CONTEXT_FETCH_REQUEST,
    id,
  };
};

export function fetchContextSuccess(id, ancestors, descendants, references) {
  return {
    type: CONTEXT_FETCH_SUCCESS,
    id,
    ancestors,
    descendants,
    references,
    statuses: ancestors.concat(descendants),
  };
};

export function fetchContextFail(id, error) {
  return {
    type: CONTEXT_FETCH_FAIL,
    id,
    error,
    skipAlert: true,
  };
};

export function muteStatus(id) {
  return (dispatch, getState) => {
    dispatch(muteStatusRequest(id));

    api(getState).post(`/api/v1/statuses/${id}/mute`).then(() => {
      dispatch(muteStatusSuccess(id));
    }).catch(error => {
      dispatch(muteStatusFail(id, error));
    });
  };
};

export function muteStatusRequest(id) {
  return {
    type: STATUS_MUTE_REQUEST,
    id,
  };
};

export function muteStatusSuccess(id) {
  return {
    type: STATUS_MUTE_SUCCESS,
    id,
  };
};

export function muteStatusFail(id, error) {
  return {
    type: STATUS_MUTE_FAIL,
    id,
    error,
  };
};

export function unmuteStatus(id) {
  return (dispatch, getState) => {
    dispatch(unmuteStatusRequest(id));

    api(getState).post(`/api/v1/statuses/${id}/unmute`).then(() => {
      dispatch(unmuteStatusSuccess(id));
    }).catch(error => {
      dispatch(unmuteStatusFail(id, error));
    });
  };
};

export function unmuteStatusRequest(id) {
  return {
    type: STATUS_UNMUTE_REQUEST,
    id,
  };
};

export function unmuteStatusSuccess(id) {
  return {
    type: STATUS_UNMUTE_SUCCESS,
    id,
  };
};

export function unmuteStatusFail(id, error) {
  return {
    type: STATUS_UNMUTE_FAIL,
    id,
    error,
  };
};

export function hideStatus(ids) {
  if (!Array.isArray(ids)) {
    ids = [ids];
  }

  return {
    type: STATUS_HIDE,
    ids,
  };
};

export function revealStatus(ids) {
  if (!Array.isArray(ids)) {
    ids = [ids];
  }

  return {
    type: STATUS_REVEAL,
    ids,
  };
};

export function toggleStatusCollapse(id, isCollapsed) {
  return {
    type: STATUS_COLLAPSE,
    id,
    isCollapsed,
  };
}
