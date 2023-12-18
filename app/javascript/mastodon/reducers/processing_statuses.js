import { TIMELINE_DELETE } from '../actions/timelines';
import { STATUS_IMPORT, STATUSES_IMPORT } from '../actions/importer';
import { Map as ImmutableMap } from 'immutable';
import { enableStatusPolling } from '../initial_state';

const importProcessingStatus = (state, status) => {
  if (!enableStatusPolling) {
    return state;
  }

  if (!status.processing || (new Date() - new Date(status.updated_at)) > 300000) {
    return state.delete(status.id);
  } else {
    return state.set(status.id, status.updated_at);
  }
};

const importProcessingStatuses = (state, statuses) =>
  state.withMutations(mutable => statuses.forEach(status => importProcessingStatus(mutable, status)));

const initialState = ImmutableMap();

export default function processing_statuses(state = initialState, action) {
  switch(action.type) {
  case STATUS_IMPORT:
    return importProcessingStatus(state, action.status);
  case STATUSES_IMPORT:
    return importProcessingStatuses(state, action.statuses);
  case TIMELINE_DELETE:
    return state.delete(action.id);
  default:
    return state;
  }
};
