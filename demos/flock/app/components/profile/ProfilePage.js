import React, {PropTypes} from 'react';
import {connect} from 'react-redux';
import { fetchSignatures, signatureSetSignatures } from '../../state/actions/signatureActions';
import { selectionSetSelectedSignatures } from '../../state/actions/selectionActions';
import Profile from './Profile';

class ProfilePage extends React.Component {
  constructor(props, context){
    super(props, context);
  }

  componentWillMount(){
    if(this.props.profile.id){
      this.props.fetchSignatures(this.props.profile.id);
    }
  }

  componentWillUnmount() {
      this.props.signatureSetSignatures([]);
  }

  componentWillReceiveProps(nextProps){
    if(this.props.profile.id != nextProps.profile.id){
      this.props.fetchSignatures(nextProps.profile.id);
    }
  }

  render(){
    return (
      <div className="page">
        <Profile
          profile={this.props.profile}
          signatureItems={this.props.signatures}
          selection={this.props.selection}
          setSelection={this.props.selectionSetSelectedSignatures}
          />
      </div>
    );
  }
}

ProfilePage.propTypes = {
  profile: PropTypes.object.isRequired,
  signatures: PropTypes.array.isRequired,
  selection: PropTypes.array.isRequired,
  fetchSignatures: PropTypes.func.isRequired,
  signatureSetSignatures: PropTypes.func.isRequired,
  selectionSetSelectedSignatures: PropTypes.func.isRequired
};

ProfilePage.contextTypes = {
  router: PropTypes.object
};

function getProfileById(profiles, id){
  const profile = profiles.filter(profile => profile.id == id);
  if (profile) return profile[0];
  return null;
}

function mapStateToProps(state, ownProps){
  const profileId = ownProps.params.id;
  let profile = {id:'', watchHref:'', name:'', dateCreated:'', lastUpdated:'', description:'', signatures:[]};
  if(profileId && state.profiles.length > 0){
    profile = getProfileById(state.profiles, profileId);
  }
  return {
    profile: profile,
    signatures: state.signatures,
    selection: state.selection.signatures
  };
}

export default connect(
    mapStateToProps,
    {
        fetchSignatures,
        signatureSetSignatures,
        selectionSetSelectedSignatures
    }
)(ProfilePage);
