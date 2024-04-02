import React, { Fragment } from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import PropTypes from 'prop-types';
import configureStore from '../store/configureStore';
import { hydrateStore } from '../actions/store';
import { IntlProvider, addLocaleData } from 'react-intl';
import { getLocale } from '../locales';
import PublicTimeline from '../features/standalone/public_timeline';
import HashtagTimeline from '../features/standalone/hashtag_timeline';
import ModalContainer from '../features/ui/containers/modal_container';
import initialState from '../initial_state';

const { localeData, messages } = getLocale();
addLocaleData(localeData);

const store = configureStore();

if (initialState) {
  store.dispatch(hydrateStore(initialState));
}

export default class TimelineContainer extends React.PureComponent {

  static propTypes = {
    locale: PropTypes.string.isRequired,
    hashtag: PropTypes.string,
    local: PropTypes.bool,
    onlyMedia: PropTypes.bool,
    withoutMedia: PropTypes.bool,
    withoutBot: PropTypes.bool,
  };

  static defaultProps = {
    local: !initialState.settings.known_fediverse,
    onlyMedia: initialState.settings.only_media,
    withoutMedia: initialState.settings.without_media,
    withoutBot: initialState.settings.without_bot,
  };

  render () {
    const { locale, hashtag, local, onlyMedia, withoutMedia, withoutBot } = this.props;

    let timeline;

    if (hashtag) {
      timeline = <HashtagTimeline hashtag={hashtag} local={local} onlyMedia={onlyMedia} withoutMedia={withoutMedia} withoutBot={withoutBot} />;
    } else {
      timeline = <PublicTimeline local={local} onlyMedia={onlyMedia} withoutMedia={withoutMedia} withoutBot={withoutBot} />;
    }

    return (
      <IntlProvider locale={locale} messages={messages}>
        <Provider store={store}>
          <Fragment>
            <div className='standalone-timeline'>
              {timeline}
            </div>

            {ReactDOM.createPortal(
              <ModalContainer />,
              document.getElementById('modal-container'),
            )}
          </Fragment>
        </Provider>
      </IntlProvider>
    );
  }

}
