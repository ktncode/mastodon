import React from 'react';
import { injectIntl } from 'react-intl';
import PropTypes from 'prop-types';

const dateFormatOptions = {
  hour12: false,
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
};

const shortDateFormatOptions = {
  month: 'short',
  day: 'numeric',
};

const shortTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
};

const DAY = 1000 * 60 * 60 * 24;

export const timeString = (intl, date, year) => {
  const delta = intl.now() - date.getTime();

  let absoluteTime;

  if (Math.abs(delta) < DAY) {
    absoluteTime = intl.formatDate(date, shortTimeFormatOptions);
  } else if (date.getFullYear() === year) {
    absoluteTime = intl.formatDate(date, shortDateFormatOptions);
  } else {
    absoluteTime = intl.formatDate(date, { ...shortDateFormatOptions, year: 'numeric' });
  }

  return absoluteTime;
};

export default @injectIntl
class AbsoluteTimestamp extends React.Component {

  static propTypes = {
    intl: PropTypes.object.isRequired,
    timestamp: PropTypes.string.isRequired,
    year: PropTypes.number.isRequired,
  };

  static defaultProps = {
    year: (new Date()).getFullYear(),
  };

  render () {
    const { timestamp, intl, year } = this.props;

    const date         = new Date(timestamp);
    const absoluteTime = timeString(intl, date, year);

    return (
      <time dateTime={timestamp} title={intl.formatDate(date, dateFormatOptions)}>
        {absoluteTime}
      </time>
    );
  }

}
