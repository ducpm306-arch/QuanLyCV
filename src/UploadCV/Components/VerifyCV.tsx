import React from "react";

export const VerifyCV = () => {
  return (
    <>
      <div className="card">
        <div className="card-head text-end">
          <button>Xoá trắng form</button>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-6">
              <label className="form-label">Họ và tên</label>
              <input type="text" className="form-control"></input>
            </div>
            <div className="col-6">
              <label className="form-label">Vị trí trúng tuyển</label>
              <input type="text" className="form-control"></input>
            </div>
          </div>

          <div className="row">
            <div className="col-6">
              <label className="form-label">Số năm kinh nghiệm</label>

              <input type="text" className="form-control"></input>
            </div>
            <div className="col-6">
              <label className="form-label">Địa chỉ enail</label>
              <input type="text" className="form-control"></input>
            </div>
          </div>

          <div className="row">
            <div className="col-6">
              <label className="form-label">Số điện thoại</label>
              <input type="text" className="form-control"></input>
            </div>
            <div className="col-6">
              <label className="form-label">Tech Stack</label>
              <input type="text" className="form-control"></input>
            </div>
          </div>

          <div className="row">
            <div className="col-12">
              <label className="form-label">Nhận xét tóm tắt CV</label>
              <input type="text" className="form-control"></input>
            </div>
          </div>

          <div className="text-end">
            <button>Huỷ bỏ</button>
            <button>Lưu CV ứng viên</button>
          </div>
        </div>
      </div>
    </>
  );
};
