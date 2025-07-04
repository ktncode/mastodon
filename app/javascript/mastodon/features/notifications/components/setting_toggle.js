import React from 'react';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import Toggle from 'react-toggle';

export default class SettingToggle extends React.PureComponent {

  static propTypes = {
    prefix: PropTypes.string,
    settings: ImmutablePropTypes.map.isRequired,
    settingPath: PropTypes.array.isRequired,
    exclusiveSettingPaths: PropTypes.array,
    label: PropTypes.node.isRequired,
    onChange: PropTypes.func.isRequired,
    defaultValue: PropTypes.bool,
    disabled: PropTypes.bool,
  }

  onChange = ({ target }) => {
    this.props.onChange(this.props.settingPath, target.checked);
    if (this.props.exclusiveSettingPaths?.length && target.checked) {
      this.props.exclusiveSettingPaths.forEach(path => {
        this.props.onChange(path, false);
      });
    }
  }

  render () {
    const { prefix, settings, settingPath, label, defaultValue, disabled } = this.props;
    const id = ['setting-toggle', prefix, ...settingPath].filter(Boolean).join('-');

    return (
      <div className='setting-toggle'>
        <Toggle disabled={disabled} id={id} checked={settings.getIn(settingPath, defaultValue)} onChange={this.onChange} onKeyDown={this.onKeyDown} />
        <label htmlFor={id} className='setting-toggle__label'>{label}</label>
      </div>
    );
  }

}
