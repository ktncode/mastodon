import { SETTING_CHANGE, SETTING_SAVE } from '../actions/settings';
import { NOTIFICATIONS_FILTER_SET } from '../actions/notifications';
import { COLUMN_ADD, COLUMN_REMOVE, COLUMN_MOVE, COLUMN_PARAMS_CHANGE } from '../actions/columns';
import { STORE_HYDRATE } from '../actions/store';
import { EMOJI_USE } from '../actions/emojis';
import { LIST_DELETE_SUCCESS, LIST_FETCH_FAIL } from '../actions/lists';
import { Map as ImmutableMap, fromJS } from 'immutable';
import uuid from '../uuid';

const initialState = ImmutableMap({
  saved: true,

  skinTone: 1,

  trends: ImmutableMap({
    show: true,
  }),

  account: ImmutableMap({
    other: ImmutableMap({
      advancedMode: true,
      openPostsFirst: false,
      withoutReblogs: false,
      showPostsInAbout: true,
      hideFeaturedTags: false,
      hidePostCount: false,
      hideFollowingCount: false,
      hideFollowerCount: false,
      hideSubscribingCount: false,
    }),
  }),

  home: ImmutableMap({
    shows: ImmutableMap({
      reblog: true,
      reply: true,
      private: true,
      limited: true,
      direct: true,
      personal: true,
    }),

    regex: ImmutableMap({
      body: '',
    }),
  }),

  limited: ImmutableMap({
    shows: ImmutableMap({
      reblog: true,
      reply: true,
      private: true,
      limited: true,
      direct: true,
      personal: true,
    }),

    regex: ImmutableMap({
      body: '',
    }),
  }),

  personal: ImmutableMap({
    shows: ImmutableMap({
      reply: true,
    }),

    regex: ImmutableMap({
      body: '',
    }),
  }),

  notifications: ImmutableMap({
    alerts: ImmutableMap({
      follow: false,
      follow_request: false,
      followed: false,
      favourite: false,
      reblog: false,
      mention: false,
      poll: false,
      status: false,
      emoji_reaction: false,
      status_reference: false,
      scheduled_status: false,
    }),

    quickFilter: ImmutableMap({
      active: 'all',
      show: true,
      advanced: false,
    }),

    dismissPermissionBanner: false,
    showUnread: true,

    shows: ImmutableMap({
      follow: true,
      follow_request: false,
      followed: true,
      favourite: true,
      reblog: true,
      mention: true,
      poll: true,
      status: true,
      emoji_reaction: true,
      status_reference: true,
      scheduled_status: true,
    }),

    sounds: ImmutableMap({
      follow: true,
      follow_request: false,
      followed: true,
      favourite: true,
      reblog: true,
      mention: true,
      poll: true,
      status: true,
      emoji_reaction: true,
      status_reference: true,
      scheduled_status: true,
    }),
  }),

  domain: ImmutableMap({
    regex: ImmutableMap({
      body: '',
    }),
  }),

  group: ImmutableMap({
    regex: ImmutableMap({
      body: '',
    }),
  }),

  public: ImmutableMap({
    regex: ImmutableMap({
      body: '',
    }),
  }),

  direct: ImmutableMap({
    regex: ImmutableMap({
      body: '',
    }),
  }),

  bookmarked_statuses: ImmutableMap({
    regex: ImmutableMap({
      body: '',
    }),
  }),

  favourited_statuses: ImmutableMap({
    regex: ImmutableMap({
      body: '',
    }),
  }),

  emoji_reactioned_statuses: ImmutableMap({
    regex: ImmutableMap({
      body: '',
    }),
  }),
});

const defaultColumns = fromJS([
  { id: 'COMPOSE', uuid: uuid(), params: {} },
  { id: 'HOME', uuid: uuid(), params: {} },
  { id: 'NOTIFICATIONS', uuid: uuid(), params: {} },
]);

const hydrate = (state, settings) => state.mergeDeep(settings).update('columns', (val = defaultColumns) => val);

const moveColumn = (state, uuid, direction) => {
  const columns  = state.get('columns');
  const index    = columns.findIndex(item => item.get('uuid') === uuid);
  const newIndex = index + direction;

  let newColumns;

  newColumns = columns.splice(index, 1);
  newColumns = newColumns.splice(newIndex, 0, columns.get(index));

  return state
    .set('columns', newColumns)
    .set('saved', false);
};

const changeColumnParams = (state, uuid, path, value) => {
  const columns = state.get('columns');
  const index   = columns.findIndex(item => item.get('uuid') === uuid);

  const newColumns = columns.update(index, column => column.updateIn(['params', ...path], () => value));

  return state
    .set('columns', newColumns)
    .set('saved', false);
};

const updateFrequentEmojis = (state, emoji) => state.update('frequentlyUsedEmojis', ImmutableMap(), map => map.update(emoji.id, 0, count => count + 1)).set('saved', false);

const filterDeadListColumns = (state, listId) => state.update('columns', columns => columns.filterNot(column => column.get('id') === 'LIST' && column.get('params').get('id') === listId));

export default function settings(state = initialState, action) {
  switch(action.type) {
  case STORE_HYDRATE:
    return hydrate(state, action.state.get('settings'));
  case NOTIFICATIONS_FILTER_SET:
  case SETTING_CHANGE:
    return state
      .setIn(action.path, action.value)
      .set('saved', false);
  case COLUMN_ADD:
    return state
      .update('columns', list => list.push(fromJS({ id: action.id, uuid: uuid(), params: action.params })))
      .set('saved', false);
  case COLUMN_REMOVE:
    return state
      .update('columns', list => list.filterNot(item => item.get('uuid') === action.uuid))
      .set('saved', false);
  case COLUMN_MOVE:
    return moveColumn(state, action.uuid, action.direction);
  case COLUMN_PARAMS_CHANGE:
    return changeColumnParams(state, action.uuid, action.path, action.value);
  case EMOJI_USE:
    return updateFrequentEmojis(state, action.emoji);
  case SETTING_SAVE:
    return state.set('saved', true);
  case LIST_FETCH_FAIL:
    return action.error.response.status === 404 ? filterDeadListColumns(state, action.id) : state;
  case LIST_DELETE_SUCCESS:
    return filterDeadListColumns(state, action.id);
  default:
    return state;
  }
};
