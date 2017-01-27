
import * as types from './profileActionTypes';
import api from '../../api/profileApi';

export function profilesLoadProfilesSuccess(profiles) {
    return {type: types.PROFILE__LOAD_PROFILES_SUCCESS,profiles};
}

export function updateProfileSucess(profile) {
  return {type: types.PROFILE__UPDATE_PROFILES_SUCCESS, profile};
}

export function createProfileSucess(profile) {
  return {type: types.PROFILE__CREATE_PROFILES_SUCCESS, profile};
}

export function fetchAllProfiles() {
    return function(dispatch) {
        return api.getAllProfiles().then(profiles => {
            dispatch(profilesLoadProfilesSuccess(profiles));
        }).catch(error => {
            throw(error);
        });
    };
}

export function saveProfile(profile) {
  return function(dispatch) {
    return api.saveProfile(profile).then(savedProfile => {
      profile.id ? dispatch(updateProfileSucess(savedProfile)) :
        dispatch(createProfileSucess(savedProfile));
    }).catch(error => {
      throw (error);
    });
  };
}
