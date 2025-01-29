import React from 'react';
import PropTypes from 'prop-types';
import { autoPlayGif } from 'mastodon/initial_state';
import { assetHost } from 'mastodon/utils/config';
import unicodeMapping from 'mastodon/features/emoji/emoji_unicode_mapping_light';
import classNames from 'classnames';

export default class Emoji extends React.PureComponent {

  static propTypes = {
    emoji: PropTypes.string.isRequired,
    className: PropTypes.string,
    hovered: PropTypes.bool.isRequired,
    url: PropTypes.string,
    static_url: PropTypes.string,
    domain: PropTypes.string,
    onClick: PropTypes.func,
  };

  render () {
    const { emoji, hovered, url, static_url, domain, onClick } = this.props;

    if (unicodeMapping[emoji]) {
      const { filename, shortCode } = unicodeMapping[emoji];
      const title = shortCode ? `:${shortCode}:` : '';
      const className = classNames('emojione', this.props.className);

      return (
        <img
          draggable='false'
          className={className}
          alt={emoji}
          title={title}
          src={`${assetHost}/emoji/${filename}.svg`}
        />
      );
    } else if (url || static_url) {
      const filename  = (autoPlayGif || hovered) && url ? url : static_url;
      const shortCode = `:${emoji}:`;
      const className = classNames('emojione custom-emoji', this.props.className, { 'clickable': onClick });

      return (
        <img
          draggable='false'
          className={className}
          alt={shortCode}
          title={emoji}
          src={filename}
          data-shortcode={emoji}
          data-domain={domain}
          data-original={url}
          data-static={static_url}
          onClick={onClick}
        />
      );
    } else {
      return null;
    }
  }

}
