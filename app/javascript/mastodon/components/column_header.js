import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';
import classNames from 'classnames';
import { FormattedMessage, injectIntl, defineMessages } from 'react-intl';
import Icon from 'mastodon/components/icon';
import { enableEmptyColumn, defaultColumnWidth } from 'mastodon/initial_state';

const messages = defineMessages({
  show: { id: 'column_header.show_settings', defaultMessage: 'Show settings' },
  hide: { id: 'column_header.hide_settings', defaultMessage: 'Hide settings' },
  moveLeft: { id: 'column_header.moveLeft_settings', defaultMessage: 'Move column to the left' },
  moveRight: { id: 'column_header.moveRight_settings', defaultMessage: 'Move column to the right' },
});

const column_width_message = [
  { id: 'x080', defaultMessage: <FormattedMessage id={'column_width.x080'} defaultMessage='80%' /> },
  { id: 'x100', defaultMessage: <FormattedMessage id={'column_width.x100'} defaultMessage='100%' /> },
  { id: 'x125', defaultMessage: <FormattedMessage id={'column_width.x125'} defaultMessage='125%' /> },
  { id: 'x150', defaultMessage: <FormattedMessage id={'column_width.x150'} defaultMessage='150%' /> },
  { id: 'free', defaultMessage: <FormattedMessage id={'column_width.free'} defaultMessage='Free' /> },
];

const mapStateToProps = (state, { columnWidth }) => ({
  columnWidth: columnWidth ?? defaultColumnWidth,
});

export default @connect(mapStateToProps)
@injectIntl
class ColumnHeader extends React.PureComponent {

  static contextTypes = {
    router: PropTypes.object,
  };

  static propTypes = {
    intl: PropTypes.object.isRequired,
    title: PropTypes.node,
    icon: PropTypes.string,
    active: PropTypes.bool,
    multiColumn: PropTypes.bool,
    extraButton: PropTypes.node,
    showBackButton: PropTypes.bool,
    children: PropTypes.node,
    pinned: PropTypes.bool,
    placeholder: PropTypes.bool,
    onPin: PropTypes.func,
    onMove: PropTypes.func,
    onClick: PropTypes.func,
    appendContent: PropTypes.node,
    collapseIssues: PropTypes.bool,
    columnWidth: PropTypes.string,
    onWidthChange: PropTypes.func,
  };

  state = {
    collapsed: true,
    animating: false,
  };

  historyBack = () => {
    if (window.history && window.history.length === 1) {
      this.context.router.history.push('/');
    } else {
      this.context.router.history.goBack();
    }
  }

  handleToggleClick = (e) => {
    e.stopPropagation();
    this.setState({ collapsed: !this.state.collapsed, animating: true });
  }

  handleTitleClick = () => {
    this.props.onClick();
  }

  handleMoveLeft = () => {
    this.props.onMove(-1);
  }

  handleMoveRight = () => {
    this.props.onMove(1);
  }

  handleBackClick = () => {
    this.historyBack();
  }

  handleCloseClick = () => {
    this.context.router.history.push('/empty');
  }

  handleTransitionEnd = () => {
    this.setState({ animating: false });
  }

  handlePin = () => {
    if (!this.props.pinned) {
      this.context.router.history.replace('/');
    }

    this.props.onPin();
  }

  handleChangeWidth = e => {
    e.stopPropagation();
    if (this.props.onWidthChange) {
      this.props.onWidthChange(e.target.value);
    }
  }

  render () {
    const { title, icon, active, children, pinned, multiColumn, extraButton, showBackButton, intl: { formatMessage }, placeholder, appendContent, collapseIssues, columnWidth } = this.props;
    const { collapsed, animating } = this.state;

    const wrapperClassName = classNames('column-header__wrapper', {
      'active': active,
    });

    const buttonClassName = classNames('column-header', {
      'active': active,
    });

    const collapsibleClassName = classNames('column-header__collapsible', {
      'collapsed': collapsed,
      'animating': animating,
    });

    const collapsibleButtonClassName = classNames('column-header__button', {
      'active': !collapsed,
    });

    let extraContent, pinButton, moveButtons, backButton, collapseButton;

    if (children) {
      extraContent = (
        <div key='extra-content' className='column-header__collapsible__extra'>
          {children}
        </div>
      );
    }

    if (multiColumn && pinned) {
      pinButton = <button key='pin-button' className='text-btn column-header__setting-btn' onClick={this.handlePin}><Icon id='times' /> <FormattedMessage id='column_header.unpin' defaultMessage='Unpin' /></button>;

      moveButtons = (
        <div key='move-buttons' className='column-header__setting-arrows'>
          <button title={formatMessage(messages.moveLeft)} aria-label={formatMessage(messages.moveLeft)} className='text-btn column-header__setting-btn' onClick={this.handleMoveLeft}><Icon id='chevron-left' /></button>
          <button title={formatMessage(messages.moveRight)} aria-label={formatMessage(messages.moveRight)} className='text-btn column-header__setting-btn' onClick={this.handleMoveRight}><Icon id='chevron-right' /></button>
        </div>
      );
    } else if (multiColumn && this.props.onPin) {
      pinButton = <button key='pin-button' className='text-btn column-header__setting-btn' onClick={this.handlePin}><Icon id='plus' /> <FormattedMessage id='column_header.pin' defaultMessage='Pin' /></button>;
    }

    if (!pinned && (multiColumn || showBackButton)) {
      backButton = multiColumn && enableEmptyColumn ? (
        <button onClick={this.handleCloseClick} className='column-header__back-button'>
          <Icon id='chevron-left' className='column-back-button__icon' fixedWidth />
          <FormattedMessage id='column_close_button.label' defaultMessage='Close' />
        </button>
      ) : (
        <button onClick={this.handleBackClick} className='column-header__back-button'>
          <Icon id='chevron-left' className='column-back-button__icon' fixedWidth />
          <FormattedMessage id='column_back_button.label' defaultMessage='Back' />
        </button>
      );
    }

    const widthButton = (
      <div className='column-settings__row' role='group' key='column-width'>
        <div className='column-width' role='group'>
          {column_width_message.map(({ id, defaultMessage }) => (
            <label key={id} className={classNames('column-width__item', { active: columnWidth === id })}>
              <input name='width' type='radio' value={id} checked={columnWidth === id} onChange={this.handleChangeWidth} />
              {defaultMessage}
            </label>
          ))}
        </div>
      </div>
    );

    const collapsedContent = [
      extraContent,
    ];

    if (multiColumn) {
      collapsedContent.unshift(widthButton);
      collapsedContent.push(moveButtons);
      collapsedContent.push(pinButton);
    }

    if (children || (multiColumn && this.props.onPin)) {
      collapseButton = (
        <button
          className={collapsibleButtonClassName}
          title={formatMessage(collapsed ? messages.show : messages.hide)}
          aria-label={formatMessage(collapsed ? messages.show : messages.hide)}
          aria-pressed={collapsed ? 'false' : 'true'}
          onClick={this.handleToggleClick}
        >
          <i className='icon-with-badge'>
            <Icon id='sliders' />
            {collapseIssues && <i className='icon-with-badge__issue-badge' />}
          </i>
        </button>
      );
    }

    const hasTitle = icon && title;

    const component = (
      <div className={wrapperClassName}>
        <h1 className={buttonClassName}>
          {hasTitle && (
            <button onClick={this.handleTitleClick}>
              <Icon id={icon} fixedWidth className='column-header__icon' />
              {title}
            </button>
          )}

          {!hasTitle && backButton}

          <div className='column-header__buttons'>
            {hasTitle && backButton}
            {extraButton}
            {collapseButton}
          </div>
        </h1>

        <div className={collapsibleClassName} tabIndex={collapsed ? -1 : null} onTransitionEnd={this.handleTransitionEnd}>
          <div className='column-header__collapsible-inner'>
            {(!collapsed || animating) && collapsedContent}
          </div>
        </div>

        {appendContent}
      </div>
    );

    if (multiColumn || placeholder) {
      return component;
    } else {
      // The portal container and the component may be rendered to the DOM in
      // the same React render pass, so the container might not be available at
      // the time `render()` is called.
      const container = document.getElementById('tabs-bar__portal');
      if (container === null) {
        // The container wasn't available, force a re-render so that the
        // component can eventually be inserted in the container and not scroll
        // with the rest of the area.
        this.forceUpdate();
        return component;
      } else {
        return createPortal(component, container);
      }
    }
  }

}
