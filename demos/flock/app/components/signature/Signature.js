import React, {PropTypes} from 'react';
import {Link} from 'react-router';

import SignatureChart from '../chart/SignatureChart';


const Signature = ({signature}) =>{
  return(
    <div className="page">
      <h1>Signature: {signature.id}</h1>
      <p>Profile: <Link to={'/profile/'+signature.profile_id}>{signature.profile_id}</Link></p>
      <p>Time: {signature.time}</p>
      <p>
        {signature.description ? signature.description : 'Add a description for '+signature.id}
      </p>
      <p>Latitude : {signature.latitude} </p>
      <p>Longitude : {signature.longitude} </p>
      <SignatureChart signature={signature} />
    </div>
  );
};

Signature.propTypes ={
  signature: PropTypes.object.isRequired,
};

export default Signature;
