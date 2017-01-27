import * as types from '../actions/profileActionTypes';

export default function profileReducer(state = [], action) {
    switch (action.type) {
        case types.PROFILE__LOAD_PROFILES_SUCCESS:
            return action.profiles;
        case types.PROFILE__CREATE_PROFILES_SUCCESS:
            return [...state, //spreadout the state
                Object.assign({}, action.profile) //tac on new course
            ];
        case types.PROFILE__UPDATE_PROFILES_SUCCESS:
            return [
                ...state.filter(profile => profile.id !== action.profile.id),
                Object.assign({}, action.profile)
            ];
        default:
            return state;
    }
}
