import React from 'react';
import { connect } from 'react-redux';
import ImmutablePureComponent from 'react-immutable-pure-component';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import LoadingIndicator from '../../components/loading_indicator';
import { fetchEmojiReactions, expandEmojiReactions } from '../../actions/interactions';
import { defineMessages, injectIntl, FormattedMessage } from 'react-intl';
import AccountContainer from '../../containers/account_container';
import Column from '../ui/components/column';
import ScrollableList from '../../components/scrollable_list';
import Icon from 'mastodon/components/icon';
import ColumnHeader from '../../components/column_header';
import Emoji from '../../components/emoji';
import ReactedHeaderContaier from '../reactioned/containers/header_container';
import { debounce } from 'lodash';
import { defaultColumnWidth } from 'mastodon/initial_state';
import { changeSetting } from '../../actions/settings';
import { changeColumnParams } from '../../actions/columns';

const messages = defineMessages({
  refresh: { id: 'refresh', defaultMessage: 'Refresh' },
});

const mapStateToProps = (state, { columnId, params: { statusId } }) => {
  const uuid = columnId;
  const columns = state.getIn(['settings', 'columns']);
  const index = columns.findIndex(c => c.get('uuid') === uuid);
  const columnWidth = (columnId && index >= 0) ? columns.get(index).getIn(['params', 'columnWidth']) : state.getIn(['settings', 'emoji_reactioned_by', 'columnWidth']);

  return {
    emojiReactions: state.getIn(['user_lists', 'emoji_reactioned_by', statusId, 'items']),
    isLoading: state.getIn(['user_lists', 'emoji_reactioned_by', statusId, 'isLoading'], true),
    hasMore: !!state.getIn(['user_lists', 'emoji_reactioned_by', statusId, 'next']),
    columnWidth: columnWidth ?? defaultColumnWidth,
  };
};

class Reaction extends ImmutablePureComponent {

  static contextTypes = {
    router: PropTypes.object,
  };

  static propTypes = {
    emojiReaction: ImmutablePropTypes.map.isRequired,
  };

  state = {
    hovered: false,
  };

  handleEmojiClick = e => {
    const shortcode = e.target.dataset.shortcode;
    const domain = e.target.dataset.domain;

    if (this.context.router) {
      e.preventDefault();
      e.stopPropagation();
      this.context.router.history.push(`/emoji_detail/${shortcode}${domain ? `@${domain}` : ''}`);
    }
  }

  handleMouseEnter = () => this.setState({ hovered: true })

  handleMouseLeave = () => this.setState({ hovered: false })

  render () {
    const { emojiReaction } = this.props;

    const title = emojiReaction.get('alternate_name') ?? emojiReaction.get('name')

    return (
      <div className='account__emoji_reaction' onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave} ref={this.setRef}>
        <Emoji className='reaction' hovered={this.state.hovered} emoji={emojiReaction.get('name')} url={emojiReaction.get('url')} static_url={emojiReaction.get('static_url')} domain={emojiReaction.get('domain')} title={title} onClick={this.handleEmojiClick} />
      </div>
    );
  };
}

class EmojiReactions extends React.PureComponent {

  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    emojiReactions: ImmutablePropTypes.list,
    multiColumn: PropTypes.bool,
    columnWidth: PropTypes.string,
    intl: PropTypes.object.isRequired,
    hasMore: PropTypes.bool,
    isLoading: PropTypes.bool,
    params: PropTypes.shape({
      statusId: PropTypes.string,
    }),
  };

  componentDidMount () {
    const { emojiReactions, params: { statusId }, dispatch } = this.props;

    if (!emojiReactions) {
      dispatch(fetchEmojiReactions(statusId));
    }
  }

  componentDidUpdate (prevProps) {
    const { emojiReactions, params: { statusId }, dispatch } = this.props;

    if (!emojiReactions || prevProps.params.statusId !== statusId) {
      dispatch(fetchEmojiReactions(statusId));
    }
  }

  handleRefresh = () => {
    const { params: { statusId }, dispatch } = this.props;

    dispatch(fetchEmojiReactions(statusId));
  }

  handleLoadMore = debounce(() => {
    const { params: { statusId }, dispatch } = this.props;

    dispatch(expandEmojiReactions(statusId));
  }, 300, { leading: true })

  handleWidthChange = (value) => {
    const { columnId, dispatch } = this.props;

    if (columnId) {
      dispatch(changeColumnParams(columnId, 'columnWidth', value));
    } else {
      dispatch(changeSetting(['emoji_reactions', 'columnWidth'], value));
    }
  }

  render () {
    const { intl, emojiReactions, multiColumn, hasMore, isLoading, columnWidth } = this.props;

    if (!emojiReactions) {
      return (
        <Column>
          <LoadingIndicator />
        </Column>
      );
    }

    const emptyMessage = <FormattedMessage id='empty_column.emoji_reactions' defaultMessage='No one has reactioned this post yet. When someone does, they will show up here.' />;

    return (
      <Column bindToDocument={!multiColumn} columnWidth={columnWidth}>
        <ColumnHeader
          showBackButton
          multiColumn={multiColumn}
          columnWidth={columnWidth}
          onWidthChange={this.handleWidthChange}
          extraButton={(
            <button className='column-header__button' title={intl.formatMessage(messages.refresh)} aria-label={intl.formatMessage(messages.refresh)} onClick={this.handleRefresh}><Icon id='refresh' /></button>
          )}
        />

        <ReactedHeaderContaier statusId={this.props.params.statusId} />

        <ScrollableList
          scrollKey='emoji_reactions'
          hasMore={hasMore}
          isLoading={isLoading}
          onLoadMore={this.handleLoadMore}
          emptyMessage={emptyMessage}
          bindToDocument={!multiColumn}
        >
          {emojiReactions.map(emojiReaction =>
            <AccountContainer key={emojiReaction.get('account')+emojiReaction.get('name')} id={emojiReaction.get('account')} withNote={false} append={<Reaction emojiReaction={emojiReaction} />} />,
          )}
        </ScrollableList>
      </Column>
    );
  }

}

export default injectIntl(connect(mapStateToProps)(EmojiReactions));
