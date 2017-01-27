import React, {PropTypes} from 'react';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import * as signatureActions from '../../state/actions/signatureActions';
import SignatureList from './SignatureList';

class SignaturesPage extends React.Component{
  constructor(props, context){
    super(props,context);
  }

  render(){
    const {signatures} = this.props;
    return (
      <div>
        <h1>Signatures</h1>
        <SignatureList signatures={signatures}/>
      </div>
    );
  }
}

SignaturesPage.propTypes = {
  actions: PropTypes.object.isRequired,
  signatures: PropTypes.array.isRequired
};

function mapStateToProps(state){ //optional arg is ownProps

  return {
    signatures: state.signatures
  };
}

function mapDispatchToProps(dispatch){
  return{
    actions: bindActionCreators(signatureActions, dispatch)
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(SignaturesPage);
