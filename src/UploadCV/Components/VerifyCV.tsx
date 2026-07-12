import React from "react";

export const VerifyCV = () => {
  return (
    <>
      <div className="mb-3 row">
        <label htmlFor="staticEmail" className="col-sm-2 col-htmlForm-label">
          Email
        </label>
        <div className="col-sm-10">
          <input
            type="text"
            readOnly
            className="htmlForm-control-plaintext"
            id="staticEmail"
            value="email@example.com"
          ></input>
        </div>
      </div>
      <div className="mb-3 row">
        <label htmlFor="inputPassword" className="col-sm-2 col-htmlForm-label">
          Password
        </label>
        <div className="col-sm-10">
          <input
            type="password"
            className="htmlForm-control"
            id="inputPassword"
          ></input>
        </div>
      </div>
    </>
  );
};
