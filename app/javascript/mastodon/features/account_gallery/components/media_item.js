import AltTextBadge from 'mastodon/components/alt_text_badge';
import Blurhash from 'mastodon/components/blurhash';
import Thumbhash from 'mastodon/components/thumbhash';
import classNames from 'classnames';
import Icon from 'mastodon/components/icon';
import { autoPlayMedia, displayMedia, useBlurhash } from 'mastodon/initial_state';
import { isIOS } from 'mastodon/is_mobile';
import PropTypes from 'prop-types';
import React from 'react';
import ImmutablePropTypes from 'react-immutable-proptypes';
import ImmutablePureComponent from 'react-immutable-pure-component';

export default class MediaItem extends ImmutablePureComponent {

  static propTypes = {
    attachment: ImmutablePropTypes.map.isRequired,
    displayWidth: PropTypes.number.isRequired,
    onOpenMedia: PropTypes.func.isRequired,
  };

  state = {
    visible: displayMedia !== 'hide_all' && !this.props.attachment.getIn(['status', 'sensitive']) || displayMedia === 'show_all',
    loaded: false,
  };

  handleImageLoad = () => {
    this.setState({ loaded: true });
  }

  handleMouseEnter = e => {
    if (this.hoverToPlay()) {
      e.target.play();
    }
  }

  handleMouseLeave = e => {
    if (this.hoverToPlay()) {
      e.target.pause();
      e.target.currentTime = 0;
    }
  }

  hoverToPlay () {
    return !autoPlayMedia && ['gifv', 'video'].indexOf(this.props.attachment.get('type')) !== -1;
  }

  handleClick = e => {
    if (e.button === 0 && !(e.ctrlKey || e.metaKey)) {
      e.preventDefault();

      if (this.state.visible) {
        this.props.onOpenMedia(this.props.attachment);
      } else {
        this.setState({ visible: true });
      }
    }
  }

  render () {
    const { attachment, displayWidth } = this.props;
    const { visible, loaded } = this.state;

    const width       = `${Math.floor((displayWidth - 4) / 3) - 4}px`;
    const height      = width;
    const status      = attachment.get('status');
    const description = attachment.get('description');
    const type        = attachment.get('type');
    let thumbnail, label, icon, content;

    const badges = [];

    if (description && description.length > 0) {
      badges.push(<AltTextBadge key='alt' description={description} />);
    }

    if (!visible) {
      icon = (
        <span className='account-gallery__item__icons'>
          <Icon id='eye-slash' />
        </span>
      );
    } else {
      if (['audio', 'video'].includes(type)) {
        content = (
          <img
            src={attachment.get('preview_url') || attachment.getIn(['account', 'avatar_static'])}
            alt={description}
            onLoad={this.handleImageLoad}
          />
        );

        if (type === 'audio') {
          label = <Icon id='music' />;
        } else {
          label = <Icon id='play' />;
        }
      } else if (type === 'image') {
        const focusX = attachment.getIn(['meta', 'focus', 'x']) || 0;
        const focusY = attachment.getIn(['meta', 'focus', 'y']) || 0;
        const x      = ((focusX /  2) + .5) * 100;
        const y      = ((focusY / -2) + .5) * 100;

        content = (
          <img
            src={attachment.get('preview_url')}
            alt={description}
            style={{ objectPosition: `${x}% ${y}%` }}
            onLoad={this.handleImageLoad}
          />
        );
      } else if (type === 'gifv') {
        content = (
          <video
            className='media-gallery__item-gifv-thumbnail'
            aria-label={description}
            role='application'
            src={attachment.get('url')}
            onMouseEnter={this.handleMouseEnter}
            onMouseLeave={this.handleMouseLeave}
            autoPlay={!isIOS() && autoPlayMedia}
            loop
            muted
          />
        );

        if (type === 'gifv') {
          badges.push(
            <span
              key='gif'
              className='media-gallery__alt__label media-gallery__alt__label--non-interactive'
            >
              GIF
            </span>,
          );
        } else {
          badges.push(
            <span
              key='video'
              className='media-gallery__alt__label media-gallery__alt__label--non-interactive'
            >
              {formatTime(Math.floor(duration))}
            </span>,
          );
        }
      }

      thumbnail = (
        <div className='media-gallery__gifv'>
          {content}

          {label && <span className='media-gallery__gifv__label'>{label}</span>}
        </div>
      );
    }

    return (
      <div className='account-gallery__item' style={{ width, height }}>
        <a className='media-gallery__item-thumbnail' href={status.get('url')} onClick={this.handleClick} target='_blank' rel='noopener noreferrer'>
          {attachment.get('thumbhash') ?
            <Thumbhash
              hash={attachment.get('thumbhash')}
              className={classNames('media-gallery__preview', { 'media-gallery__preview--hidden': visible && loaded })}
              dummy={!useBlurhash}
            />
            :
            <Blurhash
              hash={attachment.get('blurhash')}
              className={classNames('media-gallery__preview', { 'media-gallery__preview--hidden': visible && loaded })}
              dummy={!useBlurhash}
            />
          }
          {visible ? thumbnail : icon}
        </a>

        {badges.length > 0 && (
          <div className='media-gallery__item__badges'>{badges}</div>
        )}
      </div>
    );
  }

}
