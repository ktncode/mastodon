import { INTERSECTION_STATUS_ADD, INTERSECTION_STATUS_REMOVE, INTERSECTION_STATUS_REFRESH } from '../actions/statuses';
import { STATUS_IMPORT, STATUSES_IMPORT } from '../actions/importer';
import { Map as ImmutableMap } from 'immutable';
import { enableStatusPollingIntersection } from '../initial_state';

const addStatus = (state, status_id, updated_at) => {
  if (!enableStatusPollingIntersection) {
    return state;
  } else if ((new Date() - new Date(updated_at)) < 180000) {
    return state.set(status_id, updated_at);
  } else {
    return state.delete(status_id);
  }
};

const refreshStatuses = (state) =>
  state.withMutations(mutable => state.forEach((updated_at, status_id) => addStatus(mutable, status_id, updated_at)));

const importProcessingStatus = (state, status) => {
  if (!state.get(status.id, false)) {
    return state;
  }

  return addStatus(state, status.id, status.updated_at);
};

const importProcessingStatuses = (state, statuses) =>
  state.withMutations(mutable => statuses.forEach(status => importProcessingStatus(mutable, status)));

const initialState = ImmutableMap();

export default function intersection_statuses(state = initialState, action) {
  switch(action.type) {
  case INTERSECTION_STATUS_ADD:
    return addStatus(state, action.status.get('id'), action.status.get('updated_at'));
  case INTERSECTION_STATUS_REMOVE:
    return state.delete(action.status.get('id'));
  case INTERSECTION_STATUS_REFRESH:
    return refreshStatuses(state);
  case STATUS_IMPORT:
    return importProcessingStatus(state, action.status);
  case STATUSES_IMPORT:
    return importProcessingStatuses(state, action.statuses);
  default:
    return state;
  }
};
