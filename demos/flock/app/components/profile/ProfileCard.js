import React, {PropTypes} from 'react';
import {Link} from 'react-router';
import ProfileChart from '../chart/ProfileChart';


const ProfileCard = ({profile}) =>{
  let lastUpdated = new Date(profile.lastUpdated);

  return(
    <div className="card">
      <Link to={'/profile/'+profile.id}>
        <div className="card-header">
          <h2>{profile.name}</h2>
        </div>

        <div className="card-image">
          <ProfileChart profile={profile} showTicks={false} chartHeight={100} />
        </div>

        <div className="card-copy">
          <span>Last Seen: {lastUpdated.getFullYear()}/{lastUpdated.getMonth() + 1}/{lastUpdated.getDate()}</span>
          <span title={profile.signatures.length + ' occurrences'}><i className="fa fa-area-chart"></i> {profile.signatures.length}</span>
        </div>
      </Link>
    </div>
  );
};

ProfileCard.propTypes ={
  profile: PropTypes.object.isRequired
};

export default ProfileCard;
