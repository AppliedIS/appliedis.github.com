import React, {PropTypes} from 'react';
import SignatureListRow from './SignatureListRow';

const SignatureList = ({signatureItems}) => {
  return(
    <div>
      <h2>Signatures:</h2>
      <div className="signature-list-container">
        <table>
          <thead>
              <tr>
              </tr>
          </thead>
          <tbody>
            {signatureItems.map((signature, index) =>{
              return <SignatureListRow key={index} signature={signature}/>;
            })}
            </tbody>
          </table>
      </div>
    </div>
  );
};

SignatureList.propTypes = {
  signatureItems: PropTypes.array.isRequired
};

export default SignatureList;
