import React, {PropTypes} from 'react';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import * as signatureActions from '../../state/actions/signatureActions';
//import SignatureForm from './SignatureForm';
import Signature from './Signature';

class SignaturePage extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            signature: Object.assign({}, this.props.signature),
            errors: {}
        };
    }

    componentWillMount() {
        if (!this.state.signature.id) {
            this.props.actions.fetchSignature(this.props.params.id);
        }
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.signature.id != this.state.signature.id) {
            this.setState({signature: Object.assign({}, nextProps.signature)});
        }
    }

    render() {
        return (
            <div>
                <Signature signature={this.state.signature}/>
            </div>

        );
    }
}

SignaturePage.propTypes = {
    signature: PropTypes.object.isRequired,
    actions: PropTypes.object.isRequired,
    params: PropTypes.object
};

SignaturePage.contextTypes = {
    router: PropTypes.object
};

function getSignatureById(signatures, id) {
    const signature = signatures.filter(signature => signature.id == id);
    if (signature) {
        return signature[0];
    }
    return null;
}

function mapStateToProps(state, ownProps) {
    let signature = {};
    if (ownProps.params.id && state.signatures.length > 0) {
        signature = getSignatureById(state.signatures, ownProps.params.id);
    }
    return {profile: state.profile, signatures: state.signatures, signature: signature};
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators(signatureActions, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(SignaturePage);
