import React, {PropTypes} from 'react';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import * as profileActions from '../../state/actions/profileActions';
import ProfilesPageTemplate from './ProfilesPageTemplate';


class ProfilesPage extends React.Component {

    constructor(props, context) {
        super(props, context);


    }

    render() {
        const {profiles} = this.props;
        return ProfilesPageTemplate(profiles);
    }
}

ProfilesPage.propTypes = {
    actions: PropTypes.object.isRequired,
    profiles: PropTypes.array.isRequired
};

function mapStateToProps(state) { //optional arg is ownProps

    return {profiles: state.profiles};
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators(profileActions, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ProfilesPage);
