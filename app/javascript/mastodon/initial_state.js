const element = document.getElementById('initial-state');
const initialState = element && JSON.parse(element.textContent);

const getMeta = (prop) => initialState && initialState.meta && initialState.meta[prop];

export const reduceMotion = getMeta('reduce_motion');
export const autoPlayAvatar = getMeta('auto_play_avatar');
export const autoPlayEmoji = getMeta('auto_play_emoji');
export const autoPlayHeader = getMeta('auto_play_header');
export const autoPlayMedia = getMeta('auto_play_media');
export const displayMedia = getMeta('display_media');
export const expandSpoilers = getMeta('expand_spoilers');
export const followModal = getMeta('follow_modal');
export const unfollowModal = getMeta('unfollow_modal');
export const subscribeModal = getMeta('subscribe_modal');
export const unsubscribeModal = getMeta('unsubscribe_modal');
export const followTagModal = getMeta('follow_tag_modal');
export const unfollowTagModal = getMeta('unfollow_tag_modal');
export const boostModal = getMeta('boost_modal');
export const deleteModal = getMeta('delete_modal');
export const postReferenceModal = getMeta('post_reference_modal');
export const addReferenceModal = getMeta('add_reference_modal');
export const unselectReferenceModal = getMeta('unselect_reference_modal');
export const deleteScheduledStatusModal = getMeta('delete_scheduled_status_modal');
export const missingAltTextModal = getMeta('missing_alt_text_modal');
export const me = getMeta('me');
export const searchEnabled = getMeta('search_enabled');
export const invitesEnabled = getMeta('invites_enabled');
export const limitedFederationMode = getMeta('limited_federation_mode');
export const repository = getMeta('repository');
export const source_url = getMeta('source_url');
export const version = getMeta('version');
export const mascot = getMeta('mascot');
export const profile_directory = getMeta('profile_directory');
export const server_directory = getMeta('server_directory');
export const isStaff = getMeta('is_staff');
export const forceSingleColumn = !getMeta('advanced_layout');
export const useBlurhash = getMeta('use_blurhash');
export const usePendingItems = getMeta('use_pending_items');
export const showTrends = getMeta('trends');
export const title = getMeta('title');
export const cropImages = getMeta('crop_images');
export const disableSwiping = getMeta('disable_swiping');
export const confirmDomainBlock = getMeta('confirm_domain_block');
export const show_follow_button_on_timeline = getMeta('show_follow_button_on_timeline');
export const show_subscribe_button_on_timeline = getMeta('show_subscribe_button_on_timeline');
export const show_followed_by = getMeta('show_followed_by');
export const follow_button_to_list_adder = getMeta('follow_button_to_list_adder');
export const show_navigation_panel = getMeta('show_navigation_panel');
export const show_quote_button = getMeta('show_quote_button');
export const show_bookmark_button = getMeta('show_bookmark_button');
export const show_share_button = getMeta('show_share_button');
export const show_target = getMeta('show_target');
export const place_tab_bar_at_bottom = getMeta('place_tab_bar_at_bottom');
export const show_tab_bar_label = getMeta('show_tab_bar_label');
export const enableLimitedTimeline = getMeta('enable_limited_timeline');
export const enablePersonalTimeline = getMeta('enable_personal_timeline');
export const enableFederatedTimeline = getMeta('enable_federated_timeline') ?? true;
export const enableLocalTimeline = getMeta('enable_local_timeline') ?? true;
export const enableReaction = getMeta('enable_reaction');
export const compactReaction = getMeta('compact_reaction');
export const disableReactionStreaming = getMeta('disable_reaction_streaming');
export const show_reply_tree_button = getMeta('show_reply_tree_button');
export const disable_joke_appearance = getMeta('disable_joke_appearance');
export const new_features_policy = getMeta('new_features_policy');
export const enableStatusReference = getMeta('enable_status_reference');
export const maxReferences = initialState?.status_references?.max_references;
export const matchVisibilityOfReferences = getMeta('match_visibility_of_references');
export const enableEmptyColumn = getMeta('enable_empty_column');
export const showReloadButton = getMeta('show_reload_button');
export const defaultColumnWidth = getMeta('default_column_width');
export const pickerEmojiSize = getMeta('picker_emoji_size');
export const enableWideEmoji = getMeta('enable_wide_emoji');
export const enableWideEmojiReaction = getMeta('enable_wide_emoji_reaction');
export const disablePost = getMeta('disable_post');
export const disableReactions = getMeta('disable_reactions');
export const disableFollow = getMeta('disable_follow');
export const disableUnfollow = getMeta('disable_unfollow');
export const disableBlock = getMeta('disable_block');
export const disableDomainBlock = getMeta('disable_domain_block');
export const disableClearAllNotifications = getMeta('disable_clear_all_notifications');
export const disableAccountDelete = getMeta('disable_account_delete');
export const disableRelativeTime = getMeta('disable_relative_time');
export const hideDirectFromTimeline = getMeta('hide_direct_from_timeline');
export const hidePersonalFromTimeline = getMeta('hide_personal_from_timeline');
export const hidePersonalFromAccount = getMeta('hide_personal_from_account');
export const hidePrivacyMeta = getMeta('hide_privacy_meta');
export const hideLinkPreview = getMeta('hide_link_preview');
export const hidePhotoPreview = getMeta('hide_photo_preview');
export const hideVideoPreview = getMeta('hide_video_preview');
export const allowPollImage = getMeta('allow_poll_image');
export const maxReactionsPerAccount = initialState?.emoji_reactions?.max_reactions_per_account ?? 1;
export const maxAttachments = initialState?.media_attachments?.max_attachments ?? 1;
export const useLowResolutionThumbnails = getMeta('use_low_resolution_thumbnails');
export const useFullsizeAvatarOnDetail = getMeta('use_fullsize_avatar_on_detail');
export const useFullsizeHeaderOnDetail = getMeta('use_fullsize_header_on_detail');
export const hideFollowingFromYourself = getMeta('hide_following_from_yourself');
export const hideFollowersFromYourself = getMeta('hide_followers_from_yourself');
export const hideStatusesCountFromYourself = getMeta('hide_statuses_count_from_yourself');
export const hideFollowingCountFromYourself = getMeta('hide_following_count_from_yourself');
export const hideFollowersCountFromYourself = getMeta('hide_followers_count_from_yourself');
export const hideSubscribingCountFromYourself = getMeta('hide_subscribing_count_from_yourself');
export const hideJoinedDateFromYourself = getMeta('hide_joined_date_from_yourself');
export const hideReactionCounter = getMeta('hide_reaction_counter');
export const hideListOfEmojiReactionsToPosts = getMeta('hide_list_of_emoji_reactions_to_posts');
export const hideListOfFavouritesToPosts = getMeta('hide_list_of_favourites_to_posts');
export const hideListOfReblogsToPosts = getMeta('hide_list_of_reblogs_to_posts');
export const hideListOfReferredByToPosts = getMeta('hide_list_of_referred_by_to_posts');
export const hideRebloggedBy = getMeta('hide_reblogged_by');
export const enableStatusPolling = getMeta('enable_status_polling');
export const enableStatusPollingIntersection = getMeta('enable_status_polling_intersection');
export const disableAutoFocusToEmojiSearch = getMeta('disable_auto_focus_to_emoji_search');

export const maxChars = initialState?.max_toot_chars ?? 500;
export const maxFrequentlyUsedEmojis = Number(getMeta('max_frequently_used_emojis')) ?? 16;

export default initialState;
