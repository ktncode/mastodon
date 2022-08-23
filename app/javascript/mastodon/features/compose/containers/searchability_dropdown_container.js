import { connect } from 'react-redux';
import SearchabilityDropdown from '../components/searchability_dropdown';
import { changeComposeSearchability } from '../../../actions/compose';
import { openModal, closeModal } from '../../../actions/modal';
import { isUserTouching } from '../../../is_mobile';

const mapStateToProps = state => ({
  value: state.getIn(['compose', 'searchability']),
});

const mapDispatchToProps = dispatch => ({

  onChange (value) {
    dispatch(changeComposeSearchability(value));
  },

  isUserTouching,
  onModalOpen: props => dispatch(openModal('ACTIONS', props)),
  onModalClose: () => dispatch(closeModal()),

});

export default connect(mapStateToProps, mapDispatchToProps)(SearchabilityDropdown);
