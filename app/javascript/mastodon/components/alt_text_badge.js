import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import Overlay from 'react-overlays/Overlay';

const offset = [0, 4];
const popperConfig = { strategy: 'fixed' };

class AltTextBadge extends React.PureComponent {

  static propTypes = {
    description: PropTypes.string,
  };

  state = {
    open: false,
    clientX: null,
    clientY: null,
  };

  handleClick = () => {
    this.setState({ open: true });
  }

  handleClose = () => {
    this.setState({ open: false });
  }

  handleMouseDown = (e) => {
    this.setState({ clientX: e.clientX, clientY: e.clientY });
  }

  handleMouseUp = (e) => {
    const maxDelta = 5;
    const {clientX: startX, clientY: startY} = this.state;

    if (startX == null) {
      return;
    }

    const [deltaX, deltaY] = [
      Math.abs(e.clientX - startX),
      Math.abs(e.clientY - startY),
    ];

    let element = e.target;

    while (element && element instanceof HTMLElement) {
      if (
        element.localName === 'button' ||
        element.localName === 'a' ||
        element.localName === 'label'
      ) {
        return;
      }

      element = element.parentNode;
    }

    if (
      deltaX + deltaY < maxDelta &&
      (e.button === 0 || e.button === 1) &&
      e.detail >= 1
    ) {
      this.handleClose(e);
    }

    this.setState({ clientX: null, clientY: null });
  }

  setRef = (c) => {
    this.node = c;
  }

  render () {
    const { description } = this.props;
    const { open } = this.state;

    return (
      <>
        <button
          ref={this.setRef}
          className='media-gallery__alt__label'
          onClick={this.handleClick}
          aria-expanded={open}
        >
          ALT
        </button>

        <Overlay
          rootClose
          onHide={this.handleClose}
          show={open}
          target={this.node}
          placement='top-end'
          flip
          offset={offset}
          popperConfig={popperConfig}
        >
          {({ props }) => (
            <div {...props} className='hover-card-controller'>
              <div
                className='media-gallery__alt__popover dropdown-animation'
                role='region'
                onMouseDown={this.handleMouseDown}
                onMouseUp={this.handleMouseUp}
              >
                <h4>
                  <FormattedMessage
                    id='alt_text_badge.title'
                    defaultMessage='Alt text'
                  />
                </h4>
                <p>{description}</p>
              </div>
            </div>
          )}
        </Overlay>
      </>
    );
  };

}

export default AltTextBadge;
