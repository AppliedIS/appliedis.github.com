import React from 'react';
import {Route, IndexRoute} from 'react-router';

import App from './App';
// Pages
import AboutPage from './components/AboutPage';
import Error404Page from './components/Error404Page';
import ProfilesPage from './components/profile/ProfilesPage';
import ProfilePage from './components/profile/ProfilePage';
import SignaturesPage from './components/signature/SignaturesPage';
import SignaturePage from './components/signature/SignaturePage';

export default(
    <Route path="/" component={App}>
        <IndexRoute component={ProfilesPage}/>
        <Route path="about" component={AboutPage}/>
        <Route path="profiles" component={ProfilesPage}/>
        <Route path="profile/:id" component={ProfilePage}/>
        <Route path="profile" component={ProfilePage}/>
        <Route path="signatures" component={SignaturesPage}/>
        <Route path="signature/:id" component={SignaturePage}/>
        <Route path="signature" component={SignaturePage}/>
        <Route path="*" component={Error404Page}/>
    </Route>
);
