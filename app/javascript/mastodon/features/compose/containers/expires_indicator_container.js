import { connect } from 'react-redux';
import ExpiresIndicator from '../components/expires_indicator';
import { removeDateTime } from '../../../actions/compose';

const mapStateToProps = state => ({
  default_expires: state.getIn(['compose', 'default_expires']),
  expires: state.getIn(['compose', 'expires']),
  expires_action: state.getIn(['compose', 'expires_action']),
});

const mapDispatchToProps = dispatch => ({

  onCancel () {
    dispatch(removeDateTime());
  },

});

export default connect(mapStateToProps, mapDispatchToProps)(ExpiresIndicator);
