/* eslint-disable import/default */ // - This lets us do the configureStore.dev/prod trick
import React from 'react';
import ReactDom from 'react-dom';
import { Router, hashHistory } from 'react-router';
import { Provider } from 'react-redux';
import { syncHistoryWithStore } from 'react-router-redux';

import routes from './routes';
import configureStore from './state/store/configureStore';
import { fetchAllProfiles } from './state/actions/profileActions';

// Import application assets so webpack can process them
//require('../favicon.ico');
//import '../sass/main.scss';

const store = configureStore();
store.dispatch(fetchAllProfiles());

// Create an enhanced history that syncs navigation events with the store
const history = syncHistoryWithStore(hashHistory, store);

ReactDom.render(
    <Provider store={store}>
        <Router history={history} routes={routes} />
    </Provider>, document.getElementById('app')
);
