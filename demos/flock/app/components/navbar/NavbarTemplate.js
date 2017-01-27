import React from 'react';
import { Link, IndexLink } from 'react-router';

import urls from '../../urls';


const NavbarTemplate = () => {
    return (
        <div className="navigation">
            <div className="navigation__logo">
                <Link to={urls.home}><img src="./images/logo_color.svg" alt="Flock"/></Link>
            </div>
            <nav className="navigation__navbar">
                <IndexLink to={urls.home}><i className="fa fa-user"/>Profiles</IndexLink>
                <Link to={urls.about}><i className="fa fa-info"/>About</Link>
            </nav>
        </div>
    );
};

export default NavbarTemplate;
