import React from "react";

export const UploadFile = () => {
  return (
    <>
      <div className="card text-center">
        <div className="card-body">
          <h5 className="card-title">Upload file CV tại đây</h5>
          <p className="card-text">
            Chỉ chấp nhập file .pdf, .docx và dưới 5MB
          </p>
          <a href="#" className="btn btn-primary">
            Upload File
          </a>
        </div>
      </div>
    </>
  );
};
