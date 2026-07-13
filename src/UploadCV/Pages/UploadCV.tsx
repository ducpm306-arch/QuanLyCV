import React from "react";
import { UploadFile } from "../Components/UploadFile";
import { VerifyCV } from "../Components/VerifyCV";

export const UploadCV = () => {
  return (
    <>
      <div className="row">
        <div className="col-5">
          <UploadFile></UploadFile>
        </div>
        <div className="col-5">
          <VerifyCV></VerifyCV>
        </div>
      </div>
    </>
  );
};
