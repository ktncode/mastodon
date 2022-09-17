import { connect } from 'react-redux';
import ColumnSettings from '../components/column_settings';
import { changeSetting } from '../../../actions/settings';

const mapStateToProps = (state) => ({
  settings: state.getIn(['settings', 'account']),
  advancedMode: state.getIn(['settings', 'account', 'other', 'advancedMode'], false),
});

const mapDispatchToProps = (dispatch) => {
  return {
    onChange (key, checked) {
      dispatch(changeSetting(['account', ...key], checked));
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(ColumnSettings);
