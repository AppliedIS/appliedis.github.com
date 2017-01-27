import React, {PropTypes} from 'react';
import {Link} from 'react-router';

const SignatureListRow = ({signature}) => {
  return(
      <tr>
        <td><Link to={'/signatures/'+signature.id}>{signature.id}</Link></td>
      </tr>
  );
};

SignatureListRow.propTypes = {
  signature: PropTypes.object.isRequired
};

export default SignatureListRow;
