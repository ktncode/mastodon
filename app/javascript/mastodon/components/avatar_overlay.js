import React from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { autoPlayAvatar } from '../initial_state';

export default class AvatarOverlay extends React.PureComponent {

  static propTypes = {
    account: ImmutablePropTypes.map.isRequired,
    friend: ImmutablePropTypes.map.isRequired,
    animate: PropTypes.bool,
  };

  static defaultProps = {
    animate: autoPlayAvatar,
  };

  render() {
    const { account, friend, animate } = this.props;

    const baseStyle = {
      backgroundImage: `url(${account.get(animate ? 'avatar' : 'avatar_static')})`,
    };

    const overlayStyle = {
      backgroundImage: `url(${friend.get(animate ? 'avatar' : 'avatar_static')})`,
    };

    return (
      <div className='account__avatar-overlay'>
        <div className='account__avatar-overlay-base' style={baseStyle} />
        <div className='account__avatar-overlay-overlay' style={overlayStyle} />
      </div>
    );
  }

}
