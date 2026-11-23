import { useEffect, useMemo, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const emptyExtracted = {
  name: '',
  position: '',
  experience_years: 0,
  email: '',
  phone_number: '',
  tech_stacks: [],
  review: '',
};

const criteriaLabels = {
  skills: 'Kỹ năng',
  experience: 'Kinh nghiệm',
  education: 'Trình độ',
  jobRequirements: 'Yêu cầu công việc',
};

function formatReview(review) {
  const reasons = (review.criteria || [])
    .map((criterion) => {
      const label = criteriaLabels[criterion.name] || criterion.name;
      const evidence = criterion.evidence?.length
        ? ` Dẫn chứng: ${criterion.evidence.join('; ')}.`
        : '';
      return `${label}: ${criterion.explanation}${evidence}`;
    })
    .join('\n');

  return [
    `Điểm số: ${review.overallScore}/100`,
    `Nhận xét: ${review.summary}`,
    `Điểm mạnh: ${(review.strengths || []).join('; ') || 'Chưa xác định'}`,
    `Điểm yếu: ${(review.weaknesses || []).join('; ') || 'Chưa xác định'}`,
    `Lý do đánh giá:\n${reasons}`,
  ].join('\n\n');
}

function App() {
  const [page, setPage] = useState(
    window.location.pathname === '/candidates' ? 'list' : 'upload',
  );
  const [cvs, setCvs] = useState([]);
  const [positions, setPositions] = useState([]);
  const [techStacks, setTechStacks] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [cv, setCv] = useState(null);
  const [extractionReady, setExtractionReady] = useState(false);
  const [extracted, setExtracted] = useState(emptyExtracted);
  const [positionId, setPositionId] = useState('');
  const [review, setReview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [previewCv, setPreviewCv] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const previewRequest = useRef(null);
  const fileInput = useRef(null);

  useEffect(() => {
    const onPopState = () =>
      setPage(window.location.pathname === '/candidates' ? 'list' : 'upload');
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    fetch('/tech-stacks')
      .then(readJson)
      .then((data) => setTechStacks(Array.isArray(data) ? data : []))
      .catch(() => setError('Không tải được danh sách Tech Stack.'));
  }, []);

  useEffect(() => {
    fetch('/positions')
      .then(readJson)
      .then((data) => setPositions(Array.isArray(data) ? data : []))
      .catch(() => setError('Không tải được danh sách vị trí tuyển dụng.'));
  }, []);

  useEffect(() => {
    if (page !== 'list') return;
    void loadCvs();
  }, [page]);

  const allowedTypes = useMemo(() => '.pdf,.doc,.docx', []);

  async function readJson(response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || `Yêu cầu lỗi (${response.status})`);
    }
    return data;
  }

  async function loadCvs() {
    try {
      const data = await readJson(await fetch('/cvs'));
      setCvs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Không tải được danh sách CV.');
    }
  }

  function navigate(nextPage) {
    const path = nextPage === 'list' ? '/candidates' : '/upload';
    window.history.pushState({}, '', path);
    setPage(nextPage);
    setError('');
    setNotice('');
  }

  function resetForm() {
    if (busy) return;
    setSelectedFile(null);
    setCv(null);
    setExtractionReady(false);
    setReview(null);
    setExtracted(emptyExtracted);
    setPositionId('');
    setError('');
    setNotice('');
    if (fileInput.current) fileInput.current.value = '';
  }

  function chooseFile(file) {
    if (!file || busy) return;
    const validExtension = /\.(pdf|docx?|PDF|DOCX?)$/.test(file.name);
    if (!validExtension) {
      setError('Chỉ nhận file PDF, DOC hoặc DOCX.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Dung lượng file tối đa là 10 MB.');
      return;
    }
    setError('');
    setNotice('');
    setSelectedFile(file);
    setCv(null);
    setExtractionReady(false);
    setReview(null);
    setExtracted(emptyExtracted);
    setPositionId('');
    void uploadAndExtract(file, null);
  }

  async function uploadAndExtract(
    fileToUpload = selectedFile,
    existingCv = cv,
  ) {
    if (!fileToUpload) {
      setError('Chọn CV để tiếp tục.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('Đang tải CV lên và đọc nội dung...');
    try {
      let uploaded = existingCv;
      if (!uploaded) {
        const form = new FormData();
        form.append('file', fileToUpload);
        uploaded = await readJson(
          await fetch('/cvs', { method: 'POST', body: form }),
        );
        setCv(uploaded);
      }
      const data = await readJson(
        await fetch(`/cvs/${uploaded._id}/extract`, { method: 'POST' }),
      );
      setExtractionReady(true);
      setExtracted({
        ...emptyExtracted,
        ...data,
        sourcePosition: data.position || '',
        position: data.matchedPositionName || data.position || '',
        experience_years: data.experience_years ?? 0,
        tech_stacks: Array.isArray(data.tech_stacks) ? data.tech_stacks : [],
      });
      setPositionId(data.positionId || '');
      if (data.positionId) {
        try {
          const reviewData = await requestReview(uploaded._id, data.positionId);
          setReview(reviewData);
          setExtracted((current) => ({
            ...current,
            review: formatReview(reviewData),
          }));
          setNotice(
            `Đã trích xuất và đối chiếu CV với vị trí ${data.matchedPositionName}.`,
          );
        } catch (err) {
          setNotice(
            `Đã trích xuất CV và khớp vị trí ${data.matchedPositionName}. Chưa đánh giá được JD: ${err.message}`,
          );
        }
      } else {
        setNotice(
          'Đã trích xuất CV. Chưa tìm thấy vị trí tương ứng trong danh sách.',
        );
      }
      void loadCvs();
    } catch (err) {
      setError(err.message || 'Không thể tải hoặc đọc CV.');
      setNotice('');
    } finally {
      setBusy(false);
    }
  }

  async function reviewCv() {
    if (!cv || !positionId) {
      setError('Chọn vị trí tuyển dụng trước khi đánh giá.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('AI đang đối chiếu CV với vị trí đã chọn...');
    try {
      const data = await requestReview(cv._id, positionId);
      setReview(data);
      setExtracted((current) => ({ ...current, review: formatReview(data) }));
      setNotice('Đã có kết quả đánh giá. Kiểm tra rồi xác nhận để tạo CV.');
      return data;
    } catch (err) {
      setError(err.message || 'Không thể đánh giá CV.');
      setNotice('');
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function requestReview(cvId, selectedPositionId) {
    return readJson(
      await fetch(`/cvs/${cvId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positionId: selectedPositionId }),
      }),
    );
  }

  async function generateCv(reviewResult = review) {
    if (!cv || !reviewResult) return;
    setBusy(true);
    setError('');
    setNotice('Đang lưu thông tin và tạo CV theo mẫu...');
    try {
      await readJson(
        await fetch(`/cvs/${cv._id}/extracted-data`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(extracted),
        }),
      );
      await readJson(
        await fetch(`/cvs/${cv._id}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ positionId }),
        }),
      );
      const generated = await readJson(
        await fetch(`/cvs/${cv._id}/generate`, { method: 'POST' }),
      );
      setNotice(
        generated.pdf
          ? 'Đã tạo xong CV PDF và DOCX.'
          : 'Đã tạo DOCX. Máy chủ chưa có công cụ xuất PDF nên chưa có bản xem trước PDF.',
      );
      await loadCvs();
      navigate('list');
    } catch (err) {
      setError(err.message || 'Không thể tạo CV.');
      setNotice('');
      void loadCvs();
    } finally {
      setBusy(false);
    }
  }

  async function saveCandidate() {
    if (!extractionReady) {
      await uploadAndExtract();
      return;
    }
    if (!extracted.name?.trim()) {
      setError('Vui lòng nhập họ và tên ứng viên.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(extracted.email?.trim() || '')) {
      setError('Vui lòng nhập email hợp lệ.');
      return;
    }
    const reviewResult = review || (await reviewCv());
    if (reviewResult) await generateCv(reviewResult);
  }

  function updateField(field, value) {
    setExtracted((current) => ({ ...current, [field]: value }));
  }

  async function openGenerated(cvItem) {
    previewRequest.current?.abort();
    const request = new AbortController();
    previewRequest.current = request;
    setPreviewCv({ ...cvItem, loading: true, error: '' });
    try {
      const response = await fetch(`/cvs/${cvItem._id}/preview`, {
        signal: request.signal,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Chưa có file PDF để xem trước.');
      }
      if (!response.headers.get('content-type')?.includes('application/pdf')) {
        throw new Error('Máy chủ không trả về file PDF hợp lệ.');
      }
      const pdfData = new Uint8Array(await response.arrayBuffer());
      setPreviewCv({
        ...cvItem,
        loading: false,
        pdfData,
        generatedFiles: {
          ...cvItem.generatedFiles,
          pdf: cvItem.generatedFiles?.pdf || `uploads/cvs/generated/${cvItem._id}/cv.pdf`,
        },
      });
      void loadCvs();
    } catch (err) {
      if (err.name === 'AbortError') return;
      setPreviewCv({ ...cvItem, loading: false, error: err.message });
    }
  }

  function closePreview() {
    previewRequest.current?.abort();
    setPreviewCv(null);
  }

  async function deleteCv(item) {
    setDeletingId(item._id);
    setError('');
    try {
      await readJson(await fetch(`/cvs/${item._id}`, { method: 'DELETE' }));
      if (previewCv?._id === item._id) closePreview();
      await loadCvs();
      setNotice('Đã xoá CV.');
      return true;
    } catch (err) {
      setError(err.message || 'Không thể xoá CV.');
      return false;
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">H</div>
          <div>
            <div className="brand-name">HEXIGON</div>
            <div className="brand-caption">QUẢN LÝ CV</div>
          </div>
        </div>
        <div className="side-label">HỒ SƠ ỨNG VIÊN</div>
        <nav className="nav flex-column side-nav" aria-label="Điều hướng chính">
          <button
            className={`nav-link ${page === 'upload' ? 'active' : ''}`}
            onClick={() => navigate('upload')}
          >
            <span aria-hidden="true">＋</span> Tải lên CV
          </button>
          <button
            className={`nav-link ${page === 'list' ? 'active' : ''}`}
            onClick={() => navigate('list')}
          >
            <span aria-hidden="true">▤</span> Danh sách CV
          </button>
        </nav>
        <div className="sidebar-footer">Quản lý hồ sơ tuyển dụng</div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-title">
            <span className="breadcrumb-muted">CV</span>
            <span className="breadcrumb-divider">/</span>
            {page === 'upload' ? 'Tải lên CV' : 'Danh sách CV'}
          </div>
          <span className="topbar-user">HR</span>
        </header>

        <div className="page-content">
          {error && (
            <div className="alert alert-danger py-2" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="alert alert-light border py-2" role="status">
              {notice}
            </div>
          )}

          {page === 'upload' ? (
            <UploadPage
              file={selectedFile}
              fileInput={fileInput}
              extracted={extracted}
              setExtracted={updateField}
              positions={positions}
              techStacks={techStacks}
              positionId={positionId}
              setPositionId={setPositionId}
              extractionReady={extractionReady}
              review={review}
              cv={cv}
              busy={busy}
              allowedTypes={allowedTypes}
              onChooseFile={chooseFile}
              onReset={resetForm}
              onSave={saveCandidate}
            />
          ) : (
            <ListPage
              cvs={cvs}
              onRefresh={loadCvs}
              onPreview={openGenerated}
              onDelete={deleteCv}
              deletingId={deletingId}
            />
          )}
        </div>
      </main>

      {previewCv && (
        <PreviewModal item={previewCv} onClose={closePreview} />
      )}
    </div>
  );
}

function UploadPage({
  file,
  fileInput,
  extracted,
  setExtracted,
  positions,
  techStacks,
  positionId,
  setPositionId,
  extractionReady,
  review,
  cv,
  busy,
  allowedTypes,
  onChooseFile,
  onReset,
  onSave,
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Cổng nạp hồ sơ ứng viên Hexigon</h1>
          <p>
            Hệ thống nạp, bóc tách đính kèm và kiểm duyệt thông tin hồ sơ nhanh
            chóng.
          </p>
        </div>
      </div>

      <div className="upload-workspace">
        <section className="upload-card">
          <div className="upload-card-heading">
            <h2>
              <span aria-hidden="true">⇧</span> BƯỚC 1: NẠP TẬP TIN CV ĐÍNH KÈM
            </h2>
            <p>
              Hỗ trợ nạp các file PDF hoặc DOCX. Hệ thống AI-Demo sẽ bóc tách
              tức thì để giảm thiểu thao tác nhập liệu của nhà tuyển dụng.
            </p>
          </div>
          <div
            className={`upload-zone ${file ? 'has-file' : ''}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (!busy) onChooseFile(event.dataTransfer.files?.[0]);
            }}
          >
            <div className="upload-icon" aria-hidden="true">
              ⇧
            </div>
            <strong>
              {file ? file.name : 'Kéo & thả tệp CV của ứng viên vào đây'}
            </strong>
            <span>
              {file
                ? formatBytes(file.size)
                : 'Hỗ trợ định dạng PDF, DOCX tối đa 10MB'}
            </span>
            <button
              className="btn btn-dark btn-sm"
              disabled={busy}
              onClick={() => fileInput.current?.click()}
            >
              Chọn file từ thiết bị
            </button>
            <input
              ref={fileInput}
              className="visually-hidden"
              type="file"
              accept={allowedTypes}
              onChange={(event) => onChooseFile(event.target.files?.[0])}
            />
          </div>
        </section>

        <section className="candidate-card">
          <div className="candidate-card-heading">
            <h2>
              <span aria-hidden="true">✓</span> BƯỚC 2: XÁC NHẬN & CẬP NHẬT
              THÔNG TIN
            </h2>
            <button className="clear-form" onClick={onReset} disabled={busy}>
              Xóa trắng Form
            </button>
          </div>
          <div className="candidate-form">
            <TextField
              label="Họ và tên"
              value={extracted.name || ''}
              onChange={(v) => setExtracted('name', v)}
              required
              placeholder="Ví dụ: Nguyễn Văn A"
            />
            <div className="field-group">
              <label className="form-label">
                Vị trí ứng tuyển <span className="required-mark">*</span>
              </label>
              <select
                className="form-select form-select-sm"
                value={positionId}
                disabled={busy}
                onChange={(event) => {
                  const nextPosition = positions.find(
                    (item) => item._id === event.target.value,
                  );
                  setPositionId(event.target.value);
                  setReview(null);
                  setExtracted('position', nextPosition?.name || '');
                  setExtracted('review', '');
                  const allowed = techStacks
                    .filter(
                      (item) =>
                        item.position?._id === event.target.value ||
                        item.position === event.target.value,
                    )
                    .map((item) => item.name);
                  setExtracted(
                    'tech_stacks',
                    extracted.tech_stacks.filter((name) =>
                      allowed.some(
                        (item) =>
                          normalizeTechStack(item) === normalizeTechStack(name),
                      ),
                    ),
                  );
                }}
              >
                <option value="">Chọn vị trí tuyển dụng</option>
                {positions.map((position) => (
                  <option key={position._id} value={position._id}>
                    {position.name}
                  </option>
                ))}
              </select>
              {extracted.position && (
                <div className="form-text">
                  Vị trí đọc từ CV:{' '}
                  {extracted.sourcePosition || extracted.position}
                </div>
              )}
            </div>
            <TextField
              label="Số năm kinh nghiệm"
              value={extracted.experience_years ?? 0}
              type="number"
              placeholder="0"
              onChange={(v) => setExtracted('experience_years', Number(v))}
            />
            <TextField
              label="Địa chỉ Email"
              value={extracted.email || ''}
              onChange={(v) => setExtracted('email', v)}
              required
              placeholder="name@example.com"
            />
            <TextField
              label="Số điện thoại"
              value={extracted.phone_number || ''}
              onChange={(v) => setExtracted('phone_number', v)}
              placeholder="09xx xxx xxx"
            />
            <div className="field-group">
              <label className="form-label">
                Các từ khóa kỹ năng (phân tách bằng dấu phẩy)
              </label>
              <input
                className="form-control form-control-sm"
                readOnly
                value={extracted.tech_stacks.join(', ')}
                placeholder="Kỹ năng từ danh sách của vị trí"
              />
              <div className="form-text">
                Chỉ hiển thị Tech Stack có trong cơ sở dữ liệu của vị trí.
              </div>
            </div>
            <div className="field-group field-span-2">
              <label className="form-label">Nhận xét tóm tắt CV</label>
              <textarea
                className="form-control form-control-sm review-field"
                rows="3"
                value={extracted.review || ''}
                onChange={(event) => setExtracted('review', event.target.value)}
                placeholder="Kết quả đánh giá AI sẽ được thêm sau khi đối chiếu JD."
              />
            </div>
          </div>
          <div className="candidate-actions">
            <button
              className="btn btn-outline-secondary btn-sm"
              disabled={busy}
              onClick={onReset}
            >
              Hủy bỏ
            </button>
            <button
              className="btn btn-dark btn-sm"
              disabled={!file || busy || (extractionReady && !positionId)}
              onClick={onSave}
            >
              {busy
                ? 'Đang xử lý CV...'
                : cv && !extractionReady
                  ? 'Thử đọc lại CV'
                  : '✓ Lưu CV ứng viên'}
            </button>
          </div>
        </section>
      </div>
    </>
  );
}

function TextField({
  label,
  value,
  onChange,
  required = false,
  placeholder = '',
  type = 'text',
}) {
  return (
    <div className="field-group">
      <label className="form-label">
        {label}
        {required && <span className="required-mark"> *</span>}
      </label>
      <input
        className="form-control form-control-sm"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function normalizeTechStack(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '');
}

function ListPage({ cvs, onRefresh, onPreview, onDelete, deletingId }) {
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  return (
    <>
      <div className="page-heading list-heading">
        <div>
          <h1>Danh sách CV</h1>
          <p>{cvs.length} hồ sơ đã tải lên</p>
        </div>
        <button className="btn btn-outline-dark btn-sm" onClick={onRefresh}>
          Làm mới
        </button>
      </div>
      <div className="table-responsive cv-table-wrap">
        <table className="table align-middle cv-table">
          <thead>
            <tr>
              <th>Tên file</th>
              <th>Ngày tải lên</th>
              <th>Trạng thái</th>
              <th className="text-end">Tệp tạo theo mẫu</th>
              <th className="text-end">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {cvs.map((item) => (
              <tr key={item._id}>
                <td>
                  <div className="file-name">
                    {decodeUploadFileName(item.originalName)}
                  </div>
                  <div className="file-meta">{formatBytes(item.size)}</div>
                </td>
                <td>{formatDate(item.createdAt)}</td>
                <td>
                  <Status status={item.status} />
                </td>
                <td className="text-end">
                  {item.generatedFiles?.pdf ||
                  item.generatedFiles?.docx ||
                  item.status === 'generated' ? (
                    <div className="cv-actions">
                      <button
                        className="btn btn-outline-dark btn-sm"
                        onClick={() => onPreview(item)}
                      >
                        Xem CV tạo
                      </button>
                      <DownloadMenu item={item} />
                    </div>
                  ) : (
                    <span className="text-muted small">Chưa tạo</span>
                  )}
                </td>
                <td className="text-end">
                  {pendingDeleteId === item._id ? (
                    <div className="delete-confirmation">
                      <span>Xoá CV này?</span>
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        disabled={deletingId === item._id}
                        onClick={() => setPendingDeleteId(null)}
                      >
                        Huỷ
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        disabled={deletingId === item._id}
                        onClick={async () => {
                          if (await onDelete(item)) setPendingDeleteId(null);
                        }}
                      >
                        {deletingId === item._id ? 'Đang xoá...' : 'Xác nhận'}
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => setPendingDeleteId(item._id)}
                    >
                      Xoá
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {cvs.length === 0 && (
              <tr>
                <td colSpan="5" className="empty-table">
                  Chưa có CV nào được tải lên.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Status({ status }) {
  const labels = {
    uploaded: 'Đã tải lên',
    extracting: 'Đang trích xuất',
    needs_review: 'Chờ xác nhận',
    approved: 'Đã duyệt',
    generating: 'Đang tạo',
    generated: 'Đã tạo',
    failed: 'Có lỗi',
  };
  return (
    <span className={`status-label status-${status || 'uploaded'}`}>
      {labels[status] || status}
    </span>
  );
}

function PreviewModal({ item, onClose }) {
  return (
    <div
      className="modal-backdrop-custom"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        className={`preview-modal ${item.loading || item.pdfData ? '' : 'no-preview'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-title"
      >
        <div className="preview-modal-header">
          <div>
            <h2 id="preview-title">CV theo mẫu</h2>
            <span>{decodeUploadFileName(item.originalName)}</span>
          </div>
          <button className="btn btn-outline-dark btn-sm" onClick={onClose}>
            Đóng
          </button>
        </div>
        {item.loading ? (
          <div className="empty-state">Đang mở bản xem trước...</div>
        ) : item.pdfData ? (
          <PdfPreview data={item.pdfData} />
        ) : (
          <div className="empty-state">
            {item.error ||
              'Chưa có bản PDF xem trước. Bạn có thể tải DOCX để mở bằng Word.'}
          </div>
        )}
        {(item.generatedFiles?.docx || item.generatedFiles?.pdf) && (
          <div className="preview-modal-footer">
            <DownloadMenu item={item} opensUp />
          </div>
        )}
      </div>
    </div>
  );
}

function DownloadMenu({ item, opensUp = false }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector('a')?.focus();
    const closeOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div className={`download-menu ${opensUp ? 'download-menu-up' : ''}`} ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="btn btn-dark btn-sm download-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        Tải CV <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="download-options" role="menu" ref={menuRef}>
          {item.generatedFiles?.docx && (
            <a role="menuitem" href={`/cvs/${item._id}/download/docx`} onClick={() => setOpen(false)}>
              Tải DOCX
            </a>
          )}
          {(item.generatedFiles?.pdf || item.status === 'generated') && (
            <a role="menuitem" href={`/cvs/${item._id}/download/pdf`} onClick={() => setOpen(false)}>
              Tải PDF
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function PdfPreview({ data }) {
  const containerRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let documentTask;
    let pdf;
    let renderTask;
    const container = containerRef.current;

    async function renderPages() {
      try {
        documentTask = getDocument({ data });
        pdf = await documentTask.promise;
        if (cancelled) return;
        container.replaceChildren();
        for (let number = 1; number <= pdf.numPages; number += 1) {
          const page = await pdf.getPage(number);
          if (cancelled) return;
          const baseViewport = page.getViewport({ scale: 1 });
          const width = Math.max(280, container.clientWidth - 28);
          const viewport = page.getViewport({ scale: width / baseViewport.width });
          const canvas = document.createElement('canvas');
          canvas.className = 'pdf-page';
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          container.appendChild(canvas);
          renderTask = page.render({
            canvasContext: canvas.getContext('2d'),
            viewport,
            canvas,
          });
          await renderTask.promise;
          renderTask = null;
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Không thể hiển thị PDF.');
      }
    }

    void renderPages();
    return () => {
      cancelled = true;
      renderTask?.cancel();
      void pdf?.destroy();
      void documentTask?.destroy();
    };
  }, [data]);

  return error ? (
    <div className="empty-state">{error}</div>
  ) : (
    <div className="generated-preview" ref={containerRef} aria-label="Xem trước PDF" />
  );
}

function formatBytes(bytes = 0) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(
    new Date(value),
  );
}

function decodeUploadFileName(value = '') {
  if (!/[ÃÄÅÆÐ]|á[º»]/.test(value)) return value;
  const bytes = Uint8Array.from(value, (character) => character.charCodeAt(0));
  const decoded = new TextDecoder().decode(bytes);
  return decoded.includes('\uFFFD') ? value : decoded;
}

export default App;
