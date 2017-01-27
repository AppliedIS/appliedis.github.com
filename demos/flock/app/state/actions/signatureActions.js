
import * as types from './signatureActionTypes';
import api from '../../api/signatureApi';

export function signatureSetSignatures(signatures) {
    return {type: types.SIGNATURE__SET_SIGNATURES, signatures};
}

export function signatureAddSignature(signature) {
    return {type: types.SIGNATURE__ADD_SIGNATURE, signature};
}


export function fetchAllSignatures() {
    return function(dispatch) {
        return api.getAllSignatures().then(signatures => {
            dispatch(signatureSetSignatures(signatures));
            return signatures;
        }).catch(error => {
            throw(error);
        });
    };
}

export function fetchSignatures(profileId) {
    return function(dispatch) {
        return api.getAllSignaturesForProfile(profileId).then(signatures => {
            dispatch(signatureSetSignatures(signatures));
            return signatures;
        }).catch(error => {
            throw(error);
        });
    };
}

export function fetchSignature(signatureId) {
    return function(dispatch) {
        return api.getSignatureById(signatureId).then(signature => {
            dispatch(signatureAddSignature(signature));
            return signature;
        }).catch(error => {
            throw(error);
        });
    };
}
