import { connect } from 'react-redux';
import ColumnSettings from '../components/column_settings';
import { changeSetting, saveSettings } from '../../../actions/settings';

const mapStateToProps = state => ({
  settings: state.getIn(['settings', 'personal']),
});

const mapDispatchToProps = dispatch => ({

  onChange (key, checked) {
    dispatch(changeSetting(['personal', ...key], checked));
  },

  onSave () {
    dispatch(saveSettings());
  },

});

export default connect(mapStateToProps, mapDispatchToProps)(ColumnSettings);
