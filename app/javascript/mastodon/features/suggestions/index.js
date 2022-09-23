import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { fetchSuggestions, dismissSuggestion } from 'mastodon/actions/suggestions';
import Column from '../ui/components/column';
import ColumnHeader from '../../components/column_header';
import ColumnSubheading from '../ui/components/column_subheading';
import { addColumn, removeColumn, moveColumn } from '../../actions/columns';
import ScrollableList from 'mastodon/components/scrollable_list';
import { defineMessages, injectIntl, FormattedMessage } from 'react-intl';
import AccountContainer from 'mastodon/containers/account_container';
import ImmutablePureComponent from 'react-immutable-pure-component';
import { defaultColumnWidth } from 'mastodon/initial_state';
import { changeSetting } from '../../actions/settings';
import { changeColumnParams } from '../../actions/columns';

const messages = defineMessages({
  heading: { id: 'suggestions.heading', defaultMessage: 'Suggestions' },
  subheading: { id: 'suggestions.header', defaultMessage: 'You might be interested in…' },
  dismissSuggestion: { id: 'suggestions.dismiss', defaultMessage: 'Dismiss suggestion' },
});

const mapStateToProps = (state, { columnId }) => {
  const uuid = columnId;
  const columns = state.getIn(['settings', 'columns']);
  const index = columns.findIndex(c => c.get('uuid') === uuid);
  const columnWidth = (columnId && index >= 0) ? columns.get(index).getIn(['params', 'columnWidth']) : state.getIn(['settings', 'suggestions', 'columnWidth']);

  return {
    suggestions: state.getIn(['suggestions', 'items']),
    isLoading: state.getIn(['suggestions', 'isLoading'], true),
    columnWidth: columnWidth ?? defaultColumnWidth,
  };
};

export default @connect(mapStateToProps)
@injectIntl
class Suggestions extends ImmutablePureComponent {

  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    suggestions: ImmutablePropTypes.list.isRequired,
    intl: PropTypes.object.isRequired,
    columnId: PropTypes.string,
    multiColumn: PropTypes.bool,
    columnWidth: PropTypes.string,
    isLoading: PropTypes.bool,
  };

  componentDidMount () {
    this.fetchSuggestions();
  }

  fetchSuggestions = () => {
    const { dispatch } = this.props;

    dispatch(fetchSuggestions(true));
  }

  dismissSuggestion = account => {
    const { dispatch } = this.props;

    dispatch(dismissSuggestion(account.get('id'), true));
  }

  handlePin = () => {
    const { columnId, dispatch } = this.props;

    if (columnId) {
      dispatch(removeColumn(columnId));
    } else {
      dispatch(addColumn('SUGGESTIONS', {}));
    }
  }

  handleMove = (dir) => {
    const { columnId, dispatch } = this.props;
    dispatch(moveColumn(columnId, dir));
  }

  handleHeaderClick = () => {
    this.column.scrollTop();
  }

  setRef = c => {
    this.column = c;
  }

  handleWidthChange = (value) => {
    const { columnId, dispatch } = this.props;

    if (columnId) {
      dispatch(changeColumnParams(columnId, 'columnWidth', value));
    } else {
      dispatch(changeSetting(['suggestions', 'columnWidth'], value));
    }
  }

  render () {
    const { intl, suggestions, columnId, multiColumn, isLoading, columnWidth } = this.props;
    const pinned = !!columnId;

    const emptyMessage = <FormattedMessage id='empty_column.suggestions' defaultMessage='No one has suggestions yet.' />;

    return (
      <Column bindToDocument={!multiColumn} ref={this.setRef} label={intl.formatMessage(messages.heading)} columnWidth={columnWidth}>
        <ColumnHeader
          icon='user-plus'
          title={intl.formatMessage(messages.heading)}
          onPin={this.handlePin}
          onMove={this.handleMove}
          onClick={this.handleHeaderClick}
          pinned={pinned}
          multiColumn={multiColumn}
          columnWidth={columnWidth}
          onWidthChange={this.handleWidthChange}
          showBackButton
        />

        <ScrollableList
          trackScroll={!pinned}
          scrollKey={`suggestions-${columnId}`}
          isLoading={isLoading}
          emptyMessage={emptyMessage}
          prepend={<ColumnSubheading text={intl.formatMessage(messages.subheading)} />}
          bindToDocument={!multiColumn}
        >
          {suggestions && suggestions.map(suggestion => (
            <AccountContainer
              key={suggestion.get('account')}
              id={suggestion.get('account')}
              actionIcon={suggestion.get('source') === 'past_interaction' ? 'times' : null}
              actionTitle={suggestion.get('source') === 'past_interaction' ? intl.formatMessage(messages.dismissSuggestion) : null}
              onActionClick={dismissSuggestion}
            />
          ))}
        </ScrollableList>
      </Column>
    );
  }

}
