import React from 'react';
import { Link } from 'react-router';

const Error404Page = () => {
  return (
    <div>
      <h4>
        404 Page Not Found
      </h4>
      <Link to="/"> Go back to homepage </Link>
    </div>
  );
};

export default Error404Page;
