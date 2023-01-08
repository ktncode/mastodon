import api, { getLinks } from '../api';
import { Map as ImmutableMap } from 'immutable';
import { ensureComposeIsVisible } from './compose';
import { fetchStatuses, redraft } from './statuses';
import { uniqCompact } from '../utils/uniq';

export const SCHEDULED_STATUSES_FETCH_REQUEST = 'SCHEDULED_STATUSES_FETCH_REQUEST';
export const SCHEDULED_STATUSES_FETCH_SUCCESS = 'SCHEDULED_STATUSES_FETCH_SUCCESS';
export const SCHEDULED_STATUSES_FETCH_FAIL    = 'SCHEDULED_STATUSES_FETCH_FAIL';

export const SCHEDULED_STATUSES_EXPAND_REQUEST = 'SCHEDULED_STATUSES_EXPAND_REQUEST';
export const SCHEDULED_STATUSES_EXPAND_SUCCESS = 'SCHEDULED_STATUSES_EXPAND_SUCCESS';
export const SCHEDULED_STATUSES_EXPAND_FAIL    = 'SCHEDULED_STATUSES_EXPAND_FAIL';

export const SCHEDULED_STATUS_DELETE_REQUEST = 'SCHEDULED_STATUS_DELETE_REQUEST';
export const SCHEDULED_STATUS_DELETE_SUCCESS = 'SCHEDULED_STATUS_DELETE_SUCCESS';
export const SCHEDULED_STATUS_DELETE_FAIL    = 'SCHEDULED_STATUS_DELETE_FAIL';

export function fetchScheduledStatuses() {
  return (dispatch, getState) => {
    if (getState().getIn(['scheduled_statuses', 'isLoading'])) {
      return;
    }

    dispatch(fetchScheduledStatusesRequest());

    api(getState).get('/api/v1/scheduled_statuses').then(response => {
      const next = getLinks(response).refs.find(link => link.rel === 'next');
      dispatch(fetchScheduledStatusesSuccess(response.data, next ? next.uri : null));
    }).catch(error => {
      dispatch(fetchScheduledStatusesFail(error));
    });
  };
};

export function fetchScheduledStatusesRequest() {
  return {
    type: SCHEDULED_STATUSES_FETCH_REQUEST,
  };
};

export function fetchScheduledStatusesSuccess(scheduled_statuses, next) {
  return {
    type: SCHEDULED_STATUSES_FETCH_SUCCESS,
    scheduled_statuses,
    next,
  };
};

export function fetchScheduledStatusesFail(error) {
  return {
    type: SCHEDULED_STATUSES_FETCH_FAIL,
    error,
  };
};

export function expandScheduledStatuses() {
  return (dispatch, getState) => {
    const url = getState().getIn(['scheduled_statuses', 'next'], null);

    if (url === null || getState().getIn(['scheduled_statuses', 'isLoading'])) {
      return;
    }

    dispatch(expandScheduledStatusesRequest());

    api(getState).get(url).then(response => {
      const next = getLinks(response).refs.find(link => link.rel === 'next');
      dispatch(expandScheduledStatusesSuccess(response.data, next ? next.uri : null));
    }).catch(error => {
      dispatch(expandScheduledStatusesFail(error));
    });
  };
};

export function expandScheduledStatusesRequest() {
  return {
    type: SCHEDULED_STATUSES_EXPAND_REQUEST,
  };
};

export function expandScheduledStatusesSuccess(scheduled_statuses, next) {
  return {
    type: SCHEDULED_STATUSES_EXPAND_SUCCESS,
    scheduled_statuses,
    next,
  };
};

export function expandScheduledStatusesFail(error) {
  return {
    type: SCHEDULED_STATUSES_EXPAND_FAIL,
    error,
  };
};

export function deleteScheduledStatus(id) {
  return (dispatch, getState) => {
    dispatch(deleteScheduledStatusRequest(id));

    api(getState).delete(`/api/v1/scheduled_statuses/${id}`).then(() => {
      dispatch(deleteScheduledStatusSuccess(id));
    }).catch(error => {
      dispatch(deleteScheduledStatusFail(id, error));
    });
  };
};

export function deleteScheduledStatusRequest(id) {
  return {
    type: SCHEDULED_STATUS_DELETE_REQUEST,
    id: id,
  };
};

export function deleteScheduledStatusSuccess(id) {
  return {
    type: SCHEDULED_STATUS_DELETE_SUCCESS,
    id: id,
  };
};

export function deleteScheduledStatusFail(id, error) {
  return {
    type: SCHEDULED_STATUS_DELETE_FAIL,
    id: id,
    error: error,
  };
};

export function redraftScheduledStatus(scheduled_status, routerHistory) {
  return (dispatch, getState) => {
    const status = ImmutableMap({
      ...scheduled_status.get('params').toObject(),
      ...scheduled_status.delete('params').toObject(),
      scheduled_status_id: scheduled_status.get('id'),
      quote: scheduled_status.getIn(['params', 'quote_id']) ? ImmutableMap({ id: scheduled_status.getIn(['params', 'quote_id']), url: '' }) : null,
    });

    dispatch(fetchStatuses(uniqCompact([status.get('in_reply_to_id'), status.getIn(['quote', 'id']), ...status.get('status_reference_ids').toArray()])));

    const replyStatus = getState().getIn(['statuses', status.get('in_reply_to_id')], null)?.update('account', account => getState().getIn(['accounts', account])) || null;

    dispatch(redraft(getState, status, replyStatus, status.get('text')));
    ensureComposeIsVisible(getState, routerHistory);
  };
};
