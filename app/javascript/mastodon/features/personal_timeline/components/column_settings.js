import React from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import { injectIntl, FormattedMessage } from 'react-intl';
import SettingToggle from '../../notifications/components/setting_toggle';

export default @injectIntl
class ColumnSettings extends React.PureComponent {

  static propTypes = {
    settings: ImmutablePropTypes.map.isRequired,
    onChange: PropTypes.func.isRequired,
    onChangeClear: PropTypes.func.isRequired,
    intl: PropTypes.object.isRequired,
  };

  render () {
    const { settings, onChange } = this.props;

    return (
      <div>
        <span className='column-settings__section'><FormattedMessage id='personal.column_settings.basic' defaultMessage='Basic' /></span>

        <div className='column-settings__row'>
          <SettingToggle prefix='personal_timeline' settings={settings} settingPath={['shows', 'reply']} onChange={onChange} label={<FormattedMessage id='personal.column_settings.show_replies' defaultMessage='Show replies' />} />
        </div>
      </div>
    );
  }

}
