import { combineReducers } from 'redux';
import { routerReducer } from 'react-router-redux';
import profiles from './reducers/profileReducer';
import signatures from './reducers/signatureReducer';
import selection from './reducers/selectionReducer';


const rootReducer = combineReducers({
  routing: routerReducer,
  profiles,
  signatures,
  selection
});

export default rootReducer;
