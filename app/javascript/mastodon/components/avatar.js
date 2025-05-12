import React from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import classNames from 'classnames';
import { autoPlayAvatar, disable_joke_appearance } from '../initial_state';

export default class Avatar extends React.PureComponent {

  static propTypes = {
    account: ImmutablePropTypes.map.isRequired,
    size: PropTypes.number.isRequired,
    style: PropTypes.object,
    inline: PropTypes.bool,
    animate: PropTypes.bool,
    full: PropTypes.bool,
  };

  static defaultProps = {
    animate: autoPlayAvatar,
    size: 20,
    inline: false,
    full: false,
  };

  state = {
    hovering: false,
  };

  handleMouseEnter = () => {
    if (this.props.animate) return;
    this.setState({ hovering: true });
  }

  handleMouseLeave = () => {
    if (this.props.animate) return;
    this.setState({ hovering: false });
  }

  render () {
    const { account, size, animate, inline, full } = this.props;
    const { hovering } = this.state;

    const src = full && account.get('avatar_full') ? account.get('avatar_full') : account.get('avatar');
    const isCat = !disable_joke_appearance && account.getIn(['other_settings', 'is_cat']);
    const catEarsColor = !disable_joke_appearance && account.getIn(['other_settings', 'cat_ears_color']);
    const staticSrc = full && account.get('avatar_full_static') ? account.get('avatar_full_static') : account.get('avatar_static');

    const catEarsColorStyle = catEarsColor ? { '--cat-ears-color': catEarsColor } : {};

    const style = {
      ...this.props.style,
      width: `${size}px`,
      height: `${size}px`,
      minWidth: `${size}px`,
      backgroundSize: `${size}px ${size}px`,
      ...catEarsColorStyle,
    };

    if (hovering || animate) {
      style.backgroundImage = `url(${src})`;
    } else {
      style.backgroundImage = `url(${staticSrc})`;
    }

    return (
      <div
        className={classNames('account__avatar', { 'account__avatar-inline': inline, 'account__avatar-cat': isCat })}
        data-cat-ears-color={catEarsColor}
        onMouseEnter={this.handleMouseEnter}
        onMouseLeave={this.handleMouseLeave}
        style={style}
      />
    );
  }

}
