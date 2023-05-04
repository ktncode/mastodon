// @ts-check

import { thumbHashToRGBA } from 'thumbhash';
import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

const base64ToBinary = base64 => new Uint8Array(atob(base64).split('').map(x => x.charCodeAt(0)));

/**
 * @typedef ThumbhashPropsBase
 * @property {string?} hash Hash to render
 * @property {number} width
 * Width of the blurred region in pixels. Defaults to 32
 * @property {number} [height]
 * Height of the blurred region in pixels. Defaults to width
 * @property {boolean} [dummy]
 * Whether dummy mode is enabled. If enabled, nothing is rendered
 * and canvas left untouched
 */

/** @typedef {JSX.IntrinsicElements['canvas'] & ThumbhashPropsBase} ThumbhashProps */

/**
 * Component that is used to render blurred of blurhash string
 *
 * @param {ThumbhashProps} param1 Props of the component
 * @returns Canvas which will render blurred region element to embed
 */
function Thumbhash({
  hash,
  dummy = false,
  ...canvasProps
}) {
  const canvasRef = /** @type {import('react').MutableRefObject<HTMLCanvasElement>} */ (useRef());

  useEffect(() => {
    const { current: canvas } = canvasRef;

    if (dummy || !hash) return;

    try {
      const { w, h, rgba } = thumbHashToRGBA(base64ToBinary(hash));
      const imageData = new ImageData(Uint8ClampedArray.from(rgba), w, h);
      const ctx = canvas.getContext('2d');
      canvas.width = w;
      canvas.height = h;

      ctx.putImageData(imageData, 0, 0);
    } catch (err) {
      console.error('Thumbhash decoding failure', { err, hash });
    }
  }, [dummy, hash]);

  return (
    <canvas {...canvasProps} ref={canvasRef} />
  );
}

Thumbhash.propTypes = {
  hash: PropTypes.string.isRequired,
  dummy: PropTypes.bool,
};

export default React.memo(Thumbhash);
