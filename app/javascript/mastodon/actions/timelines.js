import { fetchRelationshipsSuccess, fetchRelationshipsFromStatus, fetchRelationshipsFromStatuses } from './accounts';
import { importFetchedStatus, importFetchedStatuses, importFetchedAccounts } from './importer';
import { submitMarkers } from './markers';
import api, { getLinks } from 'mastodon/api';
import { Map as ImmutableMap, List as ImmutableList } from 'immutable';
import compareId from 'mastodon/compare_id';
import { usePendingItems as preferPendingItems, show_follow_button_on_timeline, show_subscribe_button_on_timeline } from 'mastodon/initial_state';
import { getHomeVisibilities, getLimitedVisibilities } from 'mastodon/selectors';

export const TIMELINE_UPDATE  = 'TIMELINE_UPDATE';
export const TIMELINE_DELETE  = 'TIMELINE_DELETE';
export const TIMELINE_EXPIRE  = 'TIMELINE_EXPIRE';
export const TIMELINE_CLEAR   = 'TIMELINE_CLEAR';

export const TIMELINE_EXPAND_REQUEST = 'TIMELINE_EXPAND_REQUEST';
export const TIMELINE_EXPAND_SUCCESS = 'TIMELINE_EXPAND_SUCCESS';
export const TIMELINE_EXPAND_FAIL    = 'TIMELINE_EXPAND_FAIL';

export const TIMELINE_SCROLL_TOP   = 'TIMELINE_SCROLL_TOP';
export const TIMELINE_LOAD_PENDING = 'TIMELINE_LOAD_PENDING';
export const TIMELINE_DISCONNECT   = 'TIMELINE_DISCONNECT';
export const TIMELINE_CONNECT      = 'TIMELINE_CONNECT';

export const TIMELINE_MARK_AS_PARTIAL = 'TIMELINE_MARK_AS_PARTIAL';

export const loadPending = timeline => ({
  type: TIMELINE_LOAD_PENDING,
  timeline,
});

export function updateTimeline(timeline, status, accept) {
  return (dispatch, getState) => {
    if (typeof accept === 'function' && !accept(status)) {
      return;
    }

    if (getState().getIn(['timelines', timeline, 'isPartial'])) {
      // Prevent new items from being added to a partial timeline,
      // since it will be reloaded anyway

      return;
    }

    dispatch(importFetchedStatus(status));
    if (show_follow_button_on_timeline || show_subscribe_button_on_timeline || status.quote_id) {
      dispatch(fetchRelationshipsFromStatus(status));
    }

    const insertTimeline = timeline => {
      dispatch({
        type: TIMELINE_UPDATE,
        timeline,
        status,
        usePendingItems: preferPendingItems,
      });
    };

    const visibility = status.visibility_ex || status.visibility
    const homeVisibilities = getHomeVisibilities(getState());
    const limitedVisibilities = getLimitedVisibilities(getState());

    if (timeline === 'home') {
      if (homeVisibilities.length || homeVisibilities.includes(visibility)) {
        insertTimeline('home');
        dispatch(submitMarkers());
      }

      if (limitedVisibilities.includes(visibility)) {
        insertTimeline('limited');
      }

      if (visibility === 'personal') {
        insertTimeline('personal');
      }
    } else {
      insertTimeline(timeline);
    }
  };
};

export function deleteFromTimelines(id) {
  return (dispatch, getState) => {
    const accountId  = getState().getIn(['statuses', id, 'account']);
    const references = getState().get('statuses').filter(status => status.get('reblog') === id).map(status => status.get('id'));
    const quotes     = getState().get('statuses').filter(status => status.get('quote_id') === id).map(status => status.get('id'));

    dispatch({
      type: TIMELINE_DELETE,
      id,
      accountId,
      references,
      quotes,
    });
  };
};

export function expireFromTimelines(id) {
  return (dispatch, getState) => {
    const accountId  = getState().getIn(['statuses', id, 'account']);
    const references = getState().get('statuses').filter(status => status.get('reblog') === id).map(status => status.get('id'));
    const quotes     = getState().get('statuses').filter(status => status.get('quote_id') === id).map(status => status.get('id'));

    dispatch({
      type: TIMELINE_EXPIRE,
      id,
      accountId,
      references,
      quotes,
    });
  };
};

export function clearTimeline(timeline) {
  return (dispatch) => {
    dispatch({ type: TIMELINE_CLEAR, timeline });
  };
};

const noOp = () => {};

const parseTags = (tags = {}, mode) => {
  return (tags[mode] || []).map((tag) => {
    return tag.value;
  });
};

export function expandTimeline(timelineId, path, params = {}, done = noOp) {
  return (dispatch, getState) => {
    const timeline = getState().getIn(['timelines', timelineId], ImmutableMap());
    const isLoadingMore = !!params.max_id;

    if (timeline.get('isLoading')) {
      done();
      return;
    }

    if (!params.max_id && !params.pinned && (timeline.get('items', ImmutableList()).size + timeline.get('pendingItems', ImmutableList()).size) > 0) {
      const a = timeline.getIn(['pendingItems', 0]);
      const b = timeline.getIn(['items', 0]);

      if (a && b && compareId(a, b) > 0) {
        params.since_id = a;
      } else {
        params.since_id = b || a;
      }
    }

    params.compact = true;

    const isLoadingRecent = !!params.since_id;

    dispatch(expandTimelineRequest(timelineId, isLoadingMore));

    api(getState).get(path, { params }).then(response => {
      const next = getLinks(response).refs.find(link => link.rel === 'next');
      if ('statuses' in response.data && 'accounts' in response.data) {
        const { statuses, referenced_statuses, accounts, relationships } = response.data;
        dispatch(importFetchedStatuses(statuses.concat(referenced_statuses)));
        dispatch(importFetchedAccounts(accounts));
        dispatch(fetchRelationshipsSuccess(relationships));
        dispatch(expandTimelineSuccess(timelineId, statuses, next ? next.uri : null, response.status === 206, isLoadingRecent, isLoadingMore, isLoadingRecent && preferPendingItems));
      } else {
        const statuses = response.data;
        dispatch(importFetchedStatuses(statuses));
        dispatch(fetchRelationshipsFromStatuses(statuses));
        dispatch(expandTimelineSuccess(timelineId, statuses, next ? next.uri : null, response.status === 206, isLoadingRecent, isLoadingMore, isLoadingRecent && preferPendingItems));
      }

      if (timelineId === 'home') {
        dispatch(submitMarkers());
      }
    }).catch(error => {
      dispatch(expandTimelineFail(timelineId, error, isLoadingMore));
    }).finally(() => {
      done();
    });
  };
};

export const expandHomeTimeline            = ({ maxId, visibilities } = {}, done = noOp) => expandTimeline('home', '/api/v1/timelines/home', { max_id: maxId, visibilities: visibilities }, done);
export const expandLimitedTimeline         = ({ maxId, visibilities } = {}, done = noOp) => expandTimeline('limited', '/api/v1/timelines/home', { max_id: maxId, visibilities: visibilities }, done);
export const expandPersonalTimeline        = ({ maxId, onlyMedia, withoutMedia } = {}, done = noOp) => expandTimeline(`personal${withoutMedia ? ':nomedia' : ''}${onlyMedia ? ':media' : ''}`, '/api/v1/timelines/personal', { max_id: maxId, only_media: !!onlyMedia, without_media: !!withoutMedia }, done);
export const expandPublicTimeline          = ({ maxId, onlyMedia, withoutMedia, withoutBot, onlyRemote } = {}, done = noOp) => expandTimeline(`public${onlyRemote ? ':remote' : ''}${withoutBot ? ':nobot' : ':bot'}${withoutMedia ? ':nomedia' : ''}${onlyMedia ? ':media' : ''}`, '/api/v1/timelines/public', { remote: !!onlyRemote, max_id: maxId, only_media: !!onlyMedia, without_media: !!withoutMedia, without_bot: !!withoutBot }, done);
export const expandDomainTimeline          = (domain, { maxId, onlyMedia, withoutMedia, withoutBot } = {}, done = noOp) => expandTimeline(`domain${withoutBot ? ':nobot' : ':bot'}${withoutMedia ? ':nomedia' : ''}${onlyMedia ? ':media' : ''}:${domain}`, '/api/v1/timelines/public', { local: false, domain: domain, max_id: maxId, only_media: !!onlyMedia, without_media: !!withoutMedia, without_bot: !!withoutBot }, done);
export const expandGroupTimeline           = (id, { maxId, onlyMedia, withoutMedia, tagged } = {}, done = noOp) => expandTimeline(`group:${id}${withoutMedia ? ':nomedia' : ''}${onlyMedia ? ':media' : ''}${tagged ? `:${tagged}` : ''}`, `/api/v1/timelines/group/${id}`, { max_id: maxId, only_media: !!onlyMedia, without_media: !!withoutMedia, tagged: tagged }, done);
export const expandAccountTimeline         = (accountId, { maxId, withReplies, withoutReblogs, tagged } = {}) => expandTimeline(`account:${accountId}${withReplies ? ':with_replies' : ''}${withoutReblogs ? ':without_reblogs' : ''}${tagged ? `:${tagged}` : ''}`, `/api/v1/accounts/${accountId}/statuses`, { exclude_replies: !withReplies, exclude_reblogs: withoutReblogs, tagged, max_id: maxId });
export const expandAccountCoversations     = (accountId, { maxId } = {}) => expandTimeline(`account:${accountId}:conversations`, `/api/v1/accounts/${accountId}/conversations`, { max_id: maxId });
export const expandAccountFeaturedTimeline = (accountId, { tagged } = {}) => expandTimeline(`account:${accountId}:pinned${tagged ? `:${tagged}` : ''}`, `/api/v1/accounts/${accountId}/statuses`, { pinned: true, tagged });
export const expandAccountMediaTimeline    = (accountId, { maxId } = {}) => expandTimeline(`account:${accountId}:media`, `/api/v1/accounts/${accountId}/statuses`, { max_id: maxId, only_media: true, limit: 40 });
export const expandListTimeline            = (id, { maxId } = {}, done = noOp) => expandTimeline(`list:${id}`, `/api/v1/timelines/list/${id}`, { max_id: maxId }, done);
export const expandHashtagTimeline         = (hashtag, { maxId, tags } = {}, done = noOp) => {
  return expandTimeline(`hashtag:${hashtag}`, `/api/v1/timelines/tag/${hashtag}`, {
    max_id: maxId,
    any:    parseTags(tags, 'any'),
    all:    parseTags(tags, 'all'),
    none:   parseTags(tags, 'none'),
  }, done);
};

export function expandTimelineRequest(timeline, isLoadingMore) {
  return {
    type: TIMELINE_EXPAND_REQUEST,
    timeline,
    skipLoading: !isLoadingMore,
  };
};

export function expandTimelineSuccess(timeline, statuses, next, partial, isLoadingRecent, isLoadingMore, usePendingItems) {
  return {
    type: TIMELINE_EXPAND_SUCCESS,
    timeline,
    statuses,
    next,
    partial,
    isLoadingRecent,
    usePendingItems,
    skipLoading: !isLoadingMore,
  };
};

export function expandTimelineFail(timeline, error, isLoadingMore) {
  return {
    type: TIMELINE_EXPAND_FAIL,
    timeline,
    error,
    skipLoading: !isLoadingMore,
    skipNotFound: timeline.startsWith('account:'),
  };
};

export function scrollTopTimeline(timeline, top) {
  return {
    type: TIMELINE_SCROLL_TOP,
    timeline,
    top,
  };
};

export function connectTimeline(timeline) {
  return {
    type: TIMELINE_CONNECT,
    timeline,
  };
};

export const disconnectTimeline = timeline => ({
  type: TIMELINE_DISCONNECT,
  timeline,
  usePendingItems: preferPendingItems,
});

export const markAsPartial = timeline => ({
  type: TIMELINE_MARK_AS_PARTIAL,
  timeline,
});
