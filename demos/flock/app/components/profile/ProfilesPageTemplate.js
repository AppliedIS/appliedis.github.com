import React from 'react';
import ProfileCard from './ProfileCard';

const ProfilesPageTemplate = (profiles) => {
    //let sortOptions = [{value:'created', text:'Created'}, {value:'updated', text:'Updated'}, {value:'name', text:'Name'}, {value:'count', text:'Count'}];
    //let selectValue = '';
    return (
        <div className="page">
            <h1>Profiles</h1>
            <div className="cards">
                {profiles.map(profile => {
                    return <ProfileCard key={profile.id} profile={profile}/>;
                })}
            </div>

        </div>
    );
};

export default ProfilesPageTemplate;
