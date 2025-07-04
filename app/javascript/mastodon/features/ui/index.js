import classNames from 'classnames';
import React from 'react';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { HotKeys } from 'react-hotkeys';
import { defineMessages, injectIntl } from 'react-intl';
import { connect } from 'react-redux';
import { Redirect, withRouter } from 'react-router-dom';
import PropTypes from 'prop-types';
import NotificationsContainer from './containers/notifications_container';
import LoadingBarContainer from './containers/loading_bar_container';
import ModalContainer from './containers/modal_container';
import { layoutFromWindow } from 'mastodon/is_mobile';
import { debounce } from 'lodash';
import { uploadCompose, resetCompose, changeComposeSpoilerness } from '../../actions/compose';
import { updateProcessingStatuses, refreshIntersectionStatuses } from '../../actions/statuses';
import { expandHomeTimeline } from '../../actions/timelines';
import { expandNotifications } from '../../actions/notifications';
import { fetchFilters } from '../../actions/filters';
import { clearHeight } from '../../actions/height_cache';
import { focusApp, unfocusApp, changeLayout } from 'mastodon/actions/app';
import { synchronouslySubmitMarkers, submitMarkers, fetchMarkers } from 'mastodon/actions/markers';
import { getHomeVisibilities } from 'mastodon/selectors';
import { WrappedSwitch, WrappedRoute } from './util/react_router_helpers';
import UploadArea from './components/upload_area';
import ColumnsAreaContainer from './containers/columns_area_container';
import DocumentTitle from './components/document_title';
import PictureInPicture from 'mastodon/features/picture_in_picture';
import {
  Compose,
  Status,
  StatusReferences,
  GettingStarted,
  KeyboardShortcuts,
  PublicTimeline,
  CommunityTimeline,
  DomainTimeline,
  GroupTimeline,
  AccountTimeline,
  AccountGallery,
  AccountConversations,
  HomeTimeline,
  Followers,
  Following,
  Subscribing,
  Reblogs,
  Favourites,
  EmojiReactions,
  Mentions,
  DirectTimeline,
  LimitedTimeline,
  PersonalTimeline,
  HashtagTimeline,
  Notifications,
  FollowRequests,
  GenericNotFound,
  FavouritedStatuses,
  BookmarkedStatuses,
  EmojiReactionedStatuses,
  ReferredByStatuses,
  ListTimeline,
  Blocks,
  DomainBlocks,
  Mutes,
  PinnedStatuses,
  Lists,
  Circles,
  Search,
  GroupDirectory,
  Directory,
  FollowRecommendations,
  Trends,
  Suggestions,
  EmptyColumn,
  ScheduledStatuses,
  EmojiDetail,
} from './util/async-components';
import { me, enableEmptyColumn, maxAttachments } from '../../initial_state';
import { closeOnboarding, INTRODUCTION_VERSION } from 'mastodon/actions/onboarding';

// Dummy import, to make sure that <Status /> ends up in the application bundle.
// Without this it ends up in ~8 very commonly used bundles.
import '../../components/status';

const messages = defineMessages({
  beforeUnload: { id: 'ui.beforeunload', defaultMessage: 'Your draft will be lost if you leave Mastodon.' },
});

const mapStateToProps = state => ({
  layout: state.getIn(['meta', 'layout']),
  isComposing: state.getIn(['compose', 'is_composing']),
  hasComposingText: state.getIn(['compose', 'text']).trim().length !== 0,
  hasMediaAttachments: state.getIn(['compose', 'media_attachments']).size > 0,
  canUploadMore: !state.getIn(['compose', 'media_attachments']).some(x => ['audio', 'video'].includes(x.get('type'))) && state.getIn(['compose', 'media_attachments']).size < maxAttachments,
  dropdownMenuIsOpen: state.getIn(['dropdown_menu', 'openId']) !== null,
  firstLaunch: state.getIn(['settings', 'introductionVersion'], 0) < INTRODUCTION_VERSION,
  advancedMode: state.getIn(['settings', 'account', 'other', 'advancedMode'], false),
  openPostsFirst: state.getIn(['settings', 'account', 'other', 'openPostsFirst'], false),
  visibilities: getHomeVisibilities(state),
  processingStatuses: state.get('processing_statuses'),
  intersectionStatuses: state.get('intersection_statuses'),
});

const mergeProps = (stateProps, dispatchProps, ownProps) => ({
  ...ownProps,
  ...stateProps,
  ...dispatchProps,
  pollingStatuses: stateProps.processingStatuses.merge(stateProps.intersectionStatuses),
});

const keyMap = {
  help: '?',
  new: 'n',
  search: 's',
  forceNew: 'option+n',
  toggleComposeSpoilers: 'option+x',
  focusColumn: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
  reply: 'r',
  favourite: 'f',
  boost: 'b',
  mention: 'm',
  open: ['enter', 'o'],
  openProfile: 'p',
  moveDown: ['down', 'j'],
  moveUp: ['up', 'k'],
  back: 'backspace',
  goToHome: 'g h',
  goToNotifications: 'g n',
  goToFederated: 'g t',
  goToDirect: 'g d',
  goToStart: 'g s',
  goToFavourites: 'g f',
  goToEmojiReactions: 'g e',
  goToPinned: 'g p',
  goToProfile: 'g u',
  goToBlocked: 'g b',
  goToMuted: 'g m',
  goToRequests: 'g r',
  toggleHidden: 'x',
  toggleSensitive: 'h',
  openMedia: 'e',
};

class SwitchingColumnsArea extends React.PureComponent {

  static propTypes = {
    children: PropTypes.node,
    location: PropTypes.object,
    mobile: PropTypes.bool,
    advancedMode: PropTypes.bool,
    openPostsFirst: PropTypes.bool,
  };

  componentWillMount () {
    if (this.props.mobile) {
      document.body.classList.toggle('layout-single-column', true);
      document.body.classList.toggle('layout-multiple-columns', false);
    } else {
      document.body.classList.toggle('layout-single-column', false);
      document.body.classList.toggle('layout-multiple-columns', true);
    }
  }

  componentDidUpdate (prevProps) {
    if (![this.props.location.pathname, '/'].includes(prevProps.location.pathname)) {
      this.node.handleChildrenContentChange();
    }

    if (prevProps.mobile !== this.props.mobile) {
      document.body.classList.toggle('layout-single-column', this.props.mobile);
      document.body.classList.toggle('layout-multiple-columns', !this.props.mobile);
    }
  }

  setRef = c => {
    if (c) {
      this.node = c.getWrappedInstance();
    }
  }

  render () {
    const { children, mobile, advancedMode, openPostsFirst } = this.props;
    const redirect = mobile ? <Redirect from='/' to='/timelines/home' exact /> : enableEmptyColumn ? <Redirect from='/' to='/empty' exact /> : <Redirect from='/' to='/getting-started' exact />;
    const account_redirect = advancedMode && openPostsFirst ? <Redirect from='/accounts/:accountId' to='/accounts/:accountId/posts' exact /> : <Redirect from='/accounts/:accountId' to='/accounts/:accountId/about' exact />;

    return (
      <ColumnsAreaContainer ref={this.setRef} singleColumn={mobile}>
        <WrappedSwitch>
          {redirect}
          {account_redirect}
          <WrappedRoute path='/getting-started' component={GettingStarted} content={children} />
          <WrappedRoute path='/keyboard-shortcuts' component={KeyboardShortcuts} content={children} />
          <WrappedRoute path='/timelines/home' component={HomeTimeline} content={children} />
          <WrappedRoute path='/timelines/public' exact component={PublicTimeline} content={children} />
          <WrappedRoute path='/timelines/public/local' exact component={CommunityTimeline} content={children} />
          <WrappedRoute path='/timelines/public/domain/:domain' exact component={DomainTimeline} content={children} />
          <WrappedRoute path='/timelines/groups/:id/:tagged?' exact component={GroupTimeline} content={children} />
          <WrappedRoute path='/timelines/direct' component={DirectTimeline} content={children} />
          <WrappedRoute path='/timelines/limited' component={LimitedTimeline} content={children} />
          <WrappedRoute path='/timelines/personal' component={PersonalTimeline} content={children} />
          <WrappedRoute path='/timelines/tag/:id' component={HashtagTimeline} content={children} />
          <WrappedRoute path='/timelines/list/:id' component={ListTimeline} content={children} />

          <WrappedRoute path='/notifications' component={Notifications} content={children} />
          <WrappedRoute path='/favourites' component={FavouritedStatuses} content={children} />
          <WrappedRoute path='/bookmarks' component={BookmarkedStatuses} content={children} />
          <WrappedRoute path='/emoji_reactions' component={EmojiReactionedStatuses} content={children} />
          <WrappedRoute path='/pinned' component={PinnedStatuses} content={children} />

          <WrappedRoute path='/start' component={FollowRecommendations} content={children} />
          <WrappedRoute path='/search' component={Search} content={children} />
          <WrappedRoute path='/group_directory' component={GroupDirectory} content={children} />
          <WrappedRoute path='/directory' component={Directory} content={children} />
          <WrappedRoute path='/trends' component={Trends} content={children} />
          <WrappedRoute path='/suggestions' component={Suggestions} content={children} />

          <WrappedRoute path='/statuses/new' component={Compose} content={children} />
          <WrappedRoute path='/statuses/:statusId' exact component={Status} content={children} />
          <WrappedRoute path='/statuses/:statusId/references' component={StatusReferences} content={children} />
          <WrappedRoute path='/statuses/:statusId/reblogs' component={Reblogs} content={children} />
          <WrappedRoute path='/statuses/:statusId/favourites' component={Favourites} content={children} />
          <WrappedRoute path='/statuses/:statusId/emoji_reactions' component={EmojiReactions} content={children} />
          <WrappedRoute path='/statuses/:statusId/referred_by' component={ReferredByStatuses} content={children} />
          <WrappedRoute path='/statuses/:statusId/mentions' component={Mentions} content={children} />

          <WrappedRoute path='/accounts/:accountId' exact component={AccountTimeline} content={children} />
          <WrappedRoute path='/accounts/:accountId/about' exact component={AccountTimeline} content={children} componentParams={{ about: true }} />
          <WrappedRoute path='/accounts/:accountId/with_replies' component={AccountTimeline} content={children} componentParams={{ withReplies: true }} />
          <WrappedRoute path='/accounts/:accountId/posts/:tagged?' component={AccountTimeline} content={children} componentParams={{ posts: true }} />
          <WrappedRoute path='/accounts/:accountId/followers' component={Followers} content={children} />
          <WrappedRoute path='/accounts/:accountId/following' component={Following} content={children} />
          <WrappedRoute path='/accounts/:accountId/subscribing' component={Subscribing} content={children} />
          <WrappedRoute path='/accounts/:accountId/media' component={AccountGallery} content={children} />
          <WrappedRoute path='/accounts/:accountId/conversations' component={AccountConversations} content={children} />

          <WrappedRoute path='/follow_requests' component={FollowRequests} content={children} />
          <WrappedRoute path='/blocks' component={Blocks} content={children} />
          <WrappedRoute path='/domain_blocks' component={DomainBlocks} content={children} />
          <WrappedRoute path='/mutes' component={Mutes} content={children} />
          <WrappedRoute path='/lists' component={Lists} content={children} />
          <WrappedRoute path='/circles' component={Circles} content={children} />
          <WrappedRoute path='/scheduled_statuses' component={ScheduledStatuses} content={children} />
          <WrappedRoute path='/emoji_detail/:shortcode_with_domain' component={EmojiDetail} content={children} />

          <WrappedRoute path='/empty' component={EmptyColumn} content={children} />

          <WrappedRoute component={GenericNotFound} content={children} />
        </WrappedSwitch>
      </ColumnsAreaContainer>
    );
  }

}

export default
@connect(mapStateToProps, null, mergeProps)
@injectIntl
@withRouter
class UI extends React.PureComponent {

  static contextTypes = {
    router: PropTypes.object.isRequired,
  };

  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    children: PropTypes.node,
    isComposing: PropTypes.bool,
    hasComposingText: PropTypes.bool,
    hasMediaAttachments: PropTypes.bool,
    canUploadMore: PropTypes.bool,
    location: PropTypes.object,
    intl: PropTypes.object.isRequired,
    dropdownMenuIsOpen: PropTypes.bool,
    layout: PropTypes.string.isRequired,
    firstLaunch: PropTypes.bool,
    visibilities: PropTypes.arrayOf(PropTypes.string),
    advancedMode: PropTypes.bool,
    openPostsFirst: PropTypes.bool,
    pollingStatuses: ImmutablePropTypes.map,
  };

  state = {
    draggingOver: false,
  };

  handleBeforeUnload = e => {
    const { intl, dispatch, isComposing, hasComposingText, hasMediaAttachments } = this.props;

    dispatch(synchronouslySubmitMarkers());

    if (isComposing && (hasComposingText || hasMediaAttachments)) {
      e.preventDefault();
      // Setting returnValue to any string causes confirmation dialog.
      // Many browsers no longer display this text to users,
      // but we set user-friendly message for other browsers, e.g. Edge.
      e.returnValue = intl.formatMessage(messages.beforeUnload);
    }
  }

  handleWindowFocus = () => {
    this.props.dispatch(focusApp());
    this.props.dispatch(submitMarkers({ immediate: true }));
  }

  handleWindowBlur = () => {
    this.props.dispatch(unfocusApp());
  }

  handleDragEnter = (e) => {
    e.preventDefault();

    if (!this.dragTargets) {
      this.dragTargets = [];
    }

    if (this.dragTargets.indexOf(e.target) === -1) {
      this.dragTargets.push(e.target);
    }

    if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files') && this.props.canUploadMore) {
      this.setState({ draggingOver: true });
    }
  }

  handleDragOver = (e) => {
    if (this.dataTransferIsText(e.dataTransfer)) return false;

    e.preventDefault();
    e.stopPropagation();

    try {
      e.dataTransfer.dropEffect = 'copy';
    } catch (err) {

    }

    return false;
  }

  handleDrop = (e) => {
    if (this.dataTransferIsText(e.dataTransfer)) return;

    e.preventDefault();

    this.setState({ draggingOver: false });
    this.dragTargets = [];

    if (e.dataTransfer && e.dataTransfer.files.length >= 1 && this.props.canUploadMore) {
      this.props.dispatch(uploadCompose(e.dataTransfer.files));
    }
  }

  handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();

    this.dragTargets = this.dragTargets.filter(el => el !== e.target && this.node.contains(el));

    if (this.dragTargets.length > 0) {
      return;
    }

    this.setState({ draggingOver: false });
  }

  dataTransferIsText = (dataTransfer) => {
    return (dataTransfer && Array.from(dataTransfer.types).filter((type) => type === 'text/plain').length === 1);
  }

  closeUploadModal = () => {
    this.setState({ draggingOver: false });
  }

  handleServiceWorkerPostMessage = ({ data }) => {
    if (data.type === 'navigate') {
      this.context.router.history.push(data.path);
    } else {
      console.warn('Unknown message type:', data.type);
    }
  }

  handleLayoutChange = debounce(() => {
    this.props.dispatch(clearHeight()); // The cached heights are no longer accurate, invalidate
  }, 500, {
    trailing: true,
  });

  handleResize = () => {
    const layout = layoutFromWindow();

    if (layout !== this.props.layout) {
      this.handleLayoutChange.cancel();
      this.props.dispatch(changeLayout(layout));
    } else {
      this.handleLayoutChange();
    }
  }

  componentDidMount () {
    const { dispatch, visibilities } = this.props;

    window.addEventListener('focus', this.handleWindowFocus, false);
    window.addEventListener('blur', this.handleWindowBlur, false);
    window.addEventListener('beforeunload', this.handleBeforeUnload, false);
    window.addEventListener('resize', this.handleResize, { passive: true });

    document.addEventListener('dragenter', this.handleDragEnter, false);
    document.addEventListener('dragover', this.handleDragOver, false);
    document.addEventListener('drop', this.handleDrop, false);
    document.addEventListener('dragleave', this.handleDragLeave, false);
    document.addEventListener('dragend', this.handleDragEnd, false);

    if ('serviceWorker' in  navigator) {
      navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerPostMessage);
    }

    // On first launch, redirect to the follow recommendations page
    if (this.props.firstLaunch) {
      this.context.router.history.replace('/start');
      dispatch(closeOnboarding());
    }

    dispatch(fetchMarkers());
    dispatch(expandHomeTimeline({ visibilities }));
    dispatch(expandNotifications());
    setTimeout(() => this.props.dispatch(fetchFilters()), 500);

    this._checkPolling(false, this.props.pollingStatuses);

    this.hotkeys.__mousetrap__.stopCallback = (e, element) => {
      return ['TEXTAREA', 'SELECT', 'INPUT'].includes(element.tagName);
    };
  }

  componentDidUpdate (prevProps) {
    this._checkPolling(prevProps.pollingStatuses, this.props.pollingStatuses);
  }

  componentWillUnmount () {
    this._stopPolling();

    window.removeEventListener('focus', this.handleWindowFocus);
    window.removeEventListener('blur', this.handleWindowBlur);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    window.removeEventListener('resize', this.handleResize);

    document.removeEventListener('dragenter', this.handleDragEnter);
    document.removeEventListener('dragover', this.handleDragOver);
    document.removeEventListener('drop', this.handleDrop);
    document.removeEventListener('dragleave', this.handleDragLeave);
    document.removeEventListener('dragend', this.handleDragEnd);
  }

  _checkPolling (oldProcessingStatuses, newProcessingStatuses) {
    const { dispatch, pollingStatuses } = this.props;

    if (pollingStatuses.isEmpty()) {
      this._stopPolling();
    } else if (oldProcessingStatuses !== newProcessingStatuses || !this.polling) {
      this._stopPolling();
      this.polling = setInterval(() => {
        dispatch(updateProcessingStatuses(pollingStatuses));
        dispatch(refreshIntersectionStatuses());
      }, 6000);
    }
  }

  _stopPolling () {
    if (this.polling) {
      clearInterval(this.polling);
      this.polling = null;
    }
  }

  setRef = c => {
    this.node = c;
  }

  handleHotkeyNew = e => {
    e.preventDefault();

    const element = this.node.querySelector('.compose-form__autosuggest-wrapper textarea');

    if (element) {
      element.focus();
    }
  }

  handleHotkeySearch = e => {
    e.preventDefault();

    const element = this.node.querySelector('.search__input');

    if (element) {
      element.focus();
    }
  }

  handleHotkeyForceNew = e => {
    this.handleHotkeyNew(e);
    this.props.dispatch(resetCompose());
  }

  handleHotkeyToggleComposeSpoilers = e => {
    e.preventDefault();
    this.props.dispatch(changeComposeSpoilerness());
  }

  handleHotkeyFocusColumn = e => {
    const index  = (e.key * 1) + 1; // First child is drawer, skip that
    const column = this.node.querySelector(`.column:nth-child(${index})`);
    if (!column) return;
    const container = column.querySelector('.scrollable');

    if (container) {
      const status = container.querySelector('.focusable');

      if (status) {
        if (container.scrollTop > status.offsetTop) {
          status.scrollIntoView(true);
        }
        status.focus();
      }
    }
  }

  handleHotkeyBack = () => {
    if (window.history && window.history.length === 1) {
      this.context.router.history.push('/');
    } else {
      this.context.router.history.goBack();
    }
  }

  setHotkeysRef = c => {
    this.hotkeys = c;
  }

  handleHotkeyToggleHelp = () => {
    if (this.props.location.pathname === '/keyboard-shortcuts') {
      this.context.router.history.goBack();
    } else {
      this.context.router.history.push('/keyboard-shortcuts');
    }
  }

  handleHotkeyGoToHome = () => {
    this.context.router.history.push('/timelines/home');
  }

  handleHotkeyGoToNotifications = () => {
    this.context.router.history.push('/notifications');
  }

  handleHotkeyGoToFederated = () => {
    this.context.router.history.push('/timelines/public');
  }

  handleHotkeyGoToDirect = () => {
    this.context.router.history.push('/timelines/direct');
  }

  handleHotkeyGoToStart = () => {
    this.context.router.history.push('/getting-started');
  }

  handleHotkeyGoToFavourites = () => {
    this.context.router.history.push('/favourites');
  }

  handleHotkeyGoToEmojiReactions = () => {
    this.context.router.history.push('/emoji_reactions');
  }

  handleHotkeyGoToPinned = () => {
    this.context.router.history.push('/pinned');
  }

  handleHotkeyGoToProfile = () => {
    this.context.router.history.push(`/accounts/${me}`);
  }

  handleHotkeyGoToBlocked = () => {
    this.context.router.history.push('/blocks');
  }

  handleHotkeyGoToMuted = () => {
    this.context.router.history.push('/mutes');
  }

  handleHotkeyGoToRequests = () => {
    this.context.router.history.push('/follow_requests');
  }

  render () {
    const { draggingOver } = this.state;
    const { children, isComposing, location, dropdownMenuIsOpen, layout, advancedMode, openPostsFirst } = this.props;

    const handlers = {
      help: this.handleHotkeyToggleHelp,
      new: this.handleHotkeyNew,
      search: this.handleHotkeySearch,
      forceNew: this.handleHotkeyForceNew,
      toggleComposeSpoilers: this.handleHotkeyToggleComposeSpoilers,
      focusColumn: this.handleHotkeyFocusColumn,
      back: this.handleHotkeyBack,
      goToHome: this.handleHotkeyGoToHome,
      goToNotifications: this.handleHotkeyGoToNotifications,
      goToFederated: this.handleHotkeyGoToFederated,
      goToDirect: this.handleHotkeyGoToDirect,
      goToStart: this.handleHotkeyGoToStart,
      goToFavourites: this.handleHotkeyGoToFavourites,
      goToEmojiReactions: this.handleHotkeyGoToEmojiReactions,
      goToPinned: this.handleHotkeyGoToPinned,
      goToProfile: this.handleHotkeyGoToProfile,
      goToBlocked: this.handleHotkeyGoToBlocked,
      goToMuted: this.handleHotkeyGoToMuted,
      goToRequests: this.handleHotkeyGoToRequests,
    };

    return (
      <HotKeys keyMap={keyMap} handlers={handlers} ref={this.setHotkeysRef} attach={window} focused>
        <div className={classNames('ui', { 'is-composing': isComposing })} ref={this.setRef} style={{ pointerEvents: dropdownMenuIsOpen ? 'none' : null }}>
          <SwitchingColumnsArea location={location} mobile={layout === 'mobile' || layout === 'single-column'} advancedMode={advancedMode} openPostsFirst={openPostsFirst}>
            {children}
          </SwitchingColumnsArea>

          {layout !== 'mobile' && <PictureInPicture />}
          <NotificationsContainer />
          <LoadingBarContainer className='loading-bar' />
          <ModalContainer />
          <UploadArea active={draggingOver} onClose={this.closeUploadModal} />
          <DocumentTitle />
        </div>
      </HotKeys>
    );
  }

}
