import React, { PropTypes } from 'react';

import Navbar from './components/navbar';


const App = (props) => {
    return (
        <div className="application">
            <Navbar />
            <section className="content">
                {props.children}
            </section>
        </div>
    );
};

App.propTypes = {
    children: PropTypes.element
};

export default App;
