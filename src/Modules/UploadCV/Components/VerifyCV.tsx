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
              <input
                type="text"
                className="form-control"
                placeholder="VD: Nguyễn Văn A"
              ></input>
            </div>
            <div className="col-6">
              <label className="form-label">Vị trí ứng tuyển</label>
              <select className="form-select">
                <option></option>
              </select>
            </div>
          </div>

          <div className="row">
            <div className="col-6">
              <label className="form-label">Số năm kinh nghiệm</label>

              <input
                type="text"
                className="form-control"
                placeholder="0"
              ></input>
            </div>
            <div className="col-6">
              <label className="form-label">Địa chỉ enail</label>
              <input
                type="text"
                className="form-control"
                placeholder="name@example.com"
              ></input>
            </div>
          </div>

          <div className="row">
            <div className="col-6">
              <label className="form-label">Số điện thoại</label>
              <input
                type="text"
                className="form-control"
                placeholder="09xx xxx xxx"
              ></input>
            </div>
            <div className="col-6">
              <label className="form-label">Tech Stack</label>
              <input
                type="text"
                className="form-control"
                placeholder="Nhập để chọn Tech Stack"
              ></input>
            </div>
          </div>

          <div className="row">
            <div className="col-12">
              <label className="form-label">Nhận xét tóm tắt CV</label>
              <textarea
                className="form-control"
                placeholder="Ghi chú nhanh, thế mạnh đặc sắc của CV hoặc đánh giá sơ bộ"
              ></textarea>
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
