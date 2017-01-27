import * as types from '../actions/signatureActionTypes';

export default function signatureReducer(state = [], action) {
    switch (action.type) {
        case types.SIGNATURE__ADD_SIGNATURE:
            return [
                ...state,
                Object.assign({}, action.signature)
            ];
        case types.SIGNATURE__SET_SIGNATURES:
            return action.signatures;
        default:
            return state;
    }
}
