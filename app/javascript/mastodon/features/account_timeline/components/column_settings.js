import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { injectIntl, FormattedMessage } from 'react-intl';
import SettingToggle from '../../notifications/components/setting_toggle';

export default @injectIntl
class ColumnSettings extends React.PureComponent {

  static propTypes = {
    settings: ImmutablePropTypes.map.isRequired,
    advancedMode: PropTypes.bool.isRequired,
    onChange: PropTypes.func.isRequired,
    intl: PropTypes.object.isRequired,
  };

  render () {
    const { settings, advancedMode, onChange } = this.props;

    return (
      <div>
        <div className='column-settings__row'>
          <SettingToggle settings={settings} settingPath={['other', 'advancedMode']} onChange={onChange} label={<FormattedMessage id='account.column_settings.advanced_mode' defaultMessage='Advanced mode' />} />
          {advancedMode && (
            <Fragment>
              <span className='column-settings__section'><FormattedMessage id='account.column_settings.advanced_settings' defaultMessage='Advanced settings' /></span>

              <SettingToggle settings={settings} settingPath={['other', 'openPostsFirst']} onChange={onChange} label={<FormattedMessage id='account.column_settings.open_posts_first' defaultMessage='Open posts first' />} />
              <SettingToggle settings={settings} settingPath={['other', 'withoutReblogs']} onChange={onChange} label={<FormattedMessage id='account.column_settings.without_reblogs' defaultMessage='Without boosts' />} />
              <SettingToggle settings={settings} settingPath={['other', 'showPostsInAbout']} onChange={onChange} label={<FormattedMessage id='account.column_settings.show_posts_in_about' defaultMessage='Show posts in about' />} />
              <SettingToggle settings={settings} settingPath={['other', 'hideFeaturedTags']} onChange={onChange} label={<FormattedMessage id='account.column_settings.hide_featured_tags' defaultMessage='Hide featuread tags selection' />} />
              <SettingToggle settings={settings} settingPath={['other', 'hideRelation']} onChange={onChange} label={<FormattedMessage id='account.column_settings.hide_relation' defaultMessage='Hide post and follow counters (except about)' />} />
            </Fragment>
          )}
        </div>
      </div>
    );
  }

}
