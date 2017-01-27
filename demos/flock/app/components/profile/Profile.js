import React, {PropTypes} from 'react';
import PlaybackMap from '../map/PlaybackMap';
import ProfileChart from '../chart/ProfileChart';


class Profile extends React.Component {
    constructor(props, context) {
        super(props, context);

        this.onMapSelection = this.onMapSelection.bind(this);
    }

    onMapSelection(selection) {
        if (this.props.setSelection) {
            this.props.setSelection(selection ? selection : []);
        }
    }

    render() {
        const profile = this.props.profile;

        let dateCreated = new Date(profile.dateCreated);
        let lastUpdated = new Date(profile.lastUpdated);

        return(
        <div className="profile-container">
          <h1>{profile.name}</h1>
          <p>
            {profile.description ? profile.description : 'Add a description for '+profile.name}
          </p>
          <ProfileChart profile={profile} selection={this.props.selection} />
          <div className="profile-info">
            <span>Created on {dateCreated.toString()}</span>
            <span>Last seen on {lastUpdated.toString()}</span>
          </div>
          <div className="profile-details">
            <div className="profile-map-container">
              <PlaybackMap id={profile.id} data={this.props.signatureItems} selection={this.props.selection} onSelect={this.onMapSelection} />
            </div>
          </div>
        </div>
        );
    }
}

Profile.propTypes ={
  profile: PropTypes.object.isRequired,
  signatureItems: PropTypes.array.isRequired,
  selection: PropTypes.array,
  setSelection: PropTypes.func
};

export default Profile;
