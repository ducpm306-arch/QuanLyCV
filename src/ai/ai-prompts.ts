export const extractCvPrompt =
  'Trích xuất CV thành một JSON object duy nhất với các trường name, position, experience_years, email, phone_number, tech_stacks và review. review phải luôn là null vì nhận xét sẽ được tạo riêng sau khi đối chiếu với JD. Chỉ dùng thông tin có trong CV, không suy đoán hoặc bổ sung. Trường không tìm thấy trả về null; tech_stacks không tìm thấy trả về []. experience_years phải là số hoặc null. Chuyển email thành chữ thường. Chỉ trả JSON hợp lệ, không kèm giải thích.';

export const reviewCvPrompt = `
Đối chiếu CV với Job Description và trả về JSON theo cấu trúc:
overallScore (number 0-100), criteria (đúng 4 phần tử, mỗi phần tử gồm name, score 0-100, explanation, evidence là mảng chuỗi),
strengths (mảng chuỗi), weaknesses (mảng chuỗi), summary (chuỗi nhận xét tổng hợp), missingInformation (mảng chuỗi).

criteria phải có chính xác một phần tử cho từng name: skills, experience, education, jobRequirements.
skills đánh giá kỹ năng và Tech Stack được JD yêu cầu; experience đánh giá số năm và kinh nghiệm thực tế;
education đánh giá trình độ/học vấn; jobRequirements đánh giá các yêu cầu công việc còn lại.
overallScore là trung bình cộng điểm của bốn tiêu chí.
Mỗi tiêu chí phải có điểm, giải thích lý do và evidence là mảng dẫn chứng ngắn lấy từ CV.
summary phải nêu kết luận tổng quát và lý do chính; strengths và weaknesses là các ý riêng, có căn cứ trong CV.
Chỉ chọn hoặc kết luận Tech Stack từ danh sách được phép của vị trí; không thêm kỹ năng ngoài danh sách này vào phần đánh giá Tech Stack.
Chỉ sử dụng bằng chứng có trong CV; không suy đoán thông tin còn thiếu.
Nếu không có bằng chứng cho một yêu cầu, ghi rõ là chưa thấy trong CV.
Không dùng tuổi, giới tính, dân tộc, tình trạng hôn nhân, sức khỏe hoặc đặc điểm
không liên quan đến công việc để chấm điểm. Kết quả chỉ hỗ trợ người tuyển dụng,
không phải quyết định tuyển hoặc loại tự động. Chỉ trả về JSON hợp lệ.
`.trim();

export const ocrPrompt =
  'Đọc chữ trong ảnh CV và trả về JSON duy nhất dạng {"text":"..."}. Giữ nguyên tiếng Việt, số điện thoại, email, URL và xuống dòng quan trọng. Không suy đoán hoặc giải thích.';
