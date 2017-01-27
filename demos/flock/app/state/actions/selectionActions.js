
import * as types from './selectionActionTypes';

export function selectionSetSelectedSignatures(signatures) {
    return {type: types.SELECTION__SET_SELECTED_SIGNATURES, signatures};
}

export function selectionSetSelectedProfiles(profiles) {
    return {type: types.SELECTION__SET_SELECTED_PROFILES, profiles};
}
