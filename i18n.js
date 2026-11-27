/* ===== Đa ngôn ngữ Việt / English cho toàn trang =====
   Cách hoạt động (bình dân):
   - Web viết sẵn bằng tiếng Việt. Khi bấm nút 🌐 trên menu, file này quét mọi chữ đang hiện trên trang và
     thay bằng tiếng Anh nếu có trong "từ điển" bên dưới. Bấm lại thì trả về tiếng Việt.
   - Chữ mới xuất hiện sau đó (mở trang khác, popup, thông báo...) cũng được dịch tự động.
   - Muốn sửa / thêm bản dịch: thêm một dòng  'Câu tiếng Việt': 'English sentence',  vào DYN bên dưới.
   - Nội dung do ADMIN tự nhập (Journey, Team, Review, FAQ...) chỉ được dịch nếu trùng câu mẫu trong từ điển;
     câu admin tự viết mới sẽ giữ nguyên tiếng Việt.
   - Giá trị bắt đầu bằng ^ nghĩa là bỏ khoảng trắng đứng trước (dùng cho dấu chấm câu).
   Chia sẻ ra ngoài: window.I18N = { tr, lang, set, t, setTitle, translateTree } */
(function () {
  'use strict';
  const LS = 'pt_lang';
  let lang = 'vi'; try { lang = localStorage.getItem(LS) === 'en' ? 'en' : 'vi'; } catch (x) { /* không đọc được thì dùng tiếng Việt */ }
  const norm = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();

  /* ---------- Từ điển 1: chữ có sẵn trong index.html (tạo tự động) ---------- */
  const STATIC = {
 "Pipe Traffic - ĐH Khoa học Tự nhiên (HCMUS)": "Pipe Traffic - University of Science (HCMUS)",
 "Dự Án Nghiên Cứu HCMUS": "HCMUS Research Project",
 "Chat": "Chat",
 "Dự Án": "Projects",
 "Đặc Điểm Kỹ Thuật & Hạ Tầng": "Technical Specifications & Infrastructure",
 "Hành Trình (Journey)": "Journey",
 "Thành Viên & Quy Tắc": "Team & Rules",
 "Bài Toán & Giải Pháp": "Problems & Solutions",
 "Video & Bình Luận": "Video & Comments",
 "Đánh Giá & FAQ": "Reviews & FAQ",
 "Liên Hệ": "Contact",
 "Trường Đại học Khoa học Tự nhiên TP.HCM": "University of Science, Ho Chi Minh City",
 "© 2026 Pipe Traffic Team. Tất cả quyền được bảo lưu. ·": "© 2026 Pipe Traffic Team. All rights reserved. ·",
 "Liên hệ": "Contact",
 "Quản trị": "Admin panel",
 "Thành Viên": "Member",
 "Vai trò": "Role",
 "Đóng": "Close",
 "Trợ lý": "Assistant",
 "Gửi": "Send",
 "Website dùng bộ nhớ trình duyệt (cookie) để ghi nhớ đăng nhập và cải thiện trải nghiệm.": "This website uses browser storage (cookies) to remember your login and improve your experience.",
 "Từ chối": "Decline",
 "Chấp nhận": "Accept",
 "Pipe Traffic – Giao thông": "Pipe Traffic – Magnetic Pipe",
 "đường ống từ trường": "Transportation",
 "\"Kết nối không giới hạn – Giải pháp giao thông xanh và thông minh cho tương lai.\"": "\"Limitless connection – a green and smart transport solution for the future.\"",
 "Dự án nghiên cứu của sinh viên HCMUS về hệ thống di chuyển và vận chuyển bằng đường ống từ tính, giúp giảm ùn tắc và chi phí hạ tầng đô thị.": "A research project by HCMUS students on a movement and transport system using magnetic pipes, helping reduce congestion and urban infrastructure costs.",
 "Xem các dự án": "View projects",
 "Khám phá giải pháp": "Explore the solution",
 "Đặc Điểm Kỹ Thuật": "Technical Specifications",
 "Tính Năng & Tiện Ích Nổi Bật": "Key Features & Benefits",
 "Sự đổi mới toàn diện trong phương thức di chuyển đô thị thế hệ mới.": "A complete transformation in how next-generation cities move.",
 "Đệm Từ Trường Maglev": "Maglev Magnetic Cushion",
 "Lực đẩy từ tính không ma sát": "Frictionless magnetic propulsion",
 "Di chuyển cực nhanh và êm ái": "Extremely fast and smooth travel",
 "Tối ưu tuổi thọ thiết bị": "Extends equipment lifespan",
 "Kết Nối Tận Hộ Gia Đình": "Connected to Every Household",
 "Lắp đặt linh hoạt tận cửa nhà": "Flexible installation right to your door",
 "Kết nối trực tiếp tòa nhà cao tầng": "Direct connection to high-rise buildings",
 "Loại bỏ thời gian chờ đợi trạm bến": "No more waiting at stations",
 "AI Điều Hướng Khẩn Cấp": "Emergency AI Routing",
 "Tự đo khoảng cách an toàn thời gian thực": "Real-time safe-distance measurement",
 "Giải phóng làn cho xe cấp cứu, cứu hỏa": "Clears lanes for ambulances and fire engines",
 "Điều phối luồng cabin liên tục không tắc": "Keeps cabin flow continuous with no jams",
 "Môi Trường & Đô Thị Xanh": "Environment & Green Cities",
 "Không phát thải khí Carbon": "Zero carbon emissions",
 "Giảm thiểu tối đa tiếng ồn đô thị": "Greatly reduces urban noise",
 "Tiết kiệm diện tích giải phóng mặt bằng": "Saves land-clearance area",
 "Đánh Giá Hạ Tầng": "Infrastructure Assessment",
 "Bảng So Sánh Pipe Traffic & Dự Án Metro Truyền Thống": "Comparison: Pipe Traffic vs. Traditional Metro Projects",
 "Phân tích chi tiết ưu thế vượt trội của hệ thống đường ống từ trường trong đô thị nén.": "A detailed analysis of the magnetic pipe system's clear advantages in dense cities.",
 "Tiêu Chí Đánh Giá": "Evaluation Criteria",
 "Pipe Traffic (Đề Xuất Dự Án)": "Pipe Traffic (Proposed Project)",
 "Dự Án Metro Đô Thị Truyền Thống": "Traditional Urban Metro Project",
 "Khả năng kết nối tận nhà": "Door-to-door connectivity",
 "Trực tiếp tại cổng hộ gia đình / tòa nhà": "Direct to the gate of a household / building",
 "Chỉ đi qua các ga lớn trung tâm cố định": "Only passes through fixed central stations",
 "Diện tích & Không gian chiếm dụng": "Area & space occupied",
 "Nhỏ gọn, lắp đường ống treo/ngầm đa tầng": "Compact, hanging/underground multi-level pipes",
 "Cực lớn, đòi hỏi hành lang an toàn đường sắt riêng": "Very large, requires a dedicated rail safety corridor",
 "Chi phí đền bù mặt bằng": "Land-clearance compensation cost",
 "Tiết kiệm tối đa nhờ thiết kế mô-đun hóa": "Maximum savings thanks to modular design",
 "Chi phí giải tỏa đền bù vô cùng đắt đỏ": "Extremely expensive clearance and compensation costs",
 "Tính linh hoạt & AI Khẩn cấp": "Flexibility & Emergency AI",
 "AI tự động chuyển làn & ưu tiên cứu hộ": "AI automatically switches lanes and prioritises rescue",
 "Tuyến cố định, khó giải phóng làn tức thì": "Fixed routes, hard to clear lanes instantly",
 "Tốc độ điều phối & Vận hành": "Dispatch speed & operation",
 "Vận hành liên tục, không ma sát, cực êm": "Continuous, frictionless, very smooth operation",
 "Chạy theo giờ cố định, tần suất hạn chế": "Runs on a fixed schedule with limited frequency",
 "Quy Trình Hoạt Động": "How It Works",
 "Hướng Dẫn Sử Dụng Pipe Traffic Trong 3 Bước": "Using Pipe Traffic in 3 Steps",
 "Đặt Chuyến & Chọn Điểm Đến": "Book a Trip & Choose a Destination",
 "Người dùng chọn hành trình trên Ứng dụng Pipe Traffic. Cabin trượt từ trường tự động di chuyển đến trạm đường ống tại nhà bạn.": "Users pick a route in the Pipe Traffic app. A magnetic cabin automatically travels to the pipe station at your home.",
 "Vào Cabin & Khởi Hành": "Board the Cabin & Depart",
 "Bước vào cabin trượt tại cổng kết nối. Động cơ từ tính tăng tốc êm ái vào mạng lưới ống trượt đa tầng kết nối các khu vực.": "Step into the cabin at the connection gate. The magnetic motor accelerates smoothly into the multi-level pipe network linking the districts.",
 "Tự Động Đến Nơi An Toàn": "Arrive Safely, Automatically",
 "AI liên tục tính toán khoảng cách an toàn, đưa cabin cập bến chính xác tại điểm đến target mà không lo kẹt xe.": "The AI continuously calculates safe distances and brings the cabin to dock precisely at the target destination, with no traffic jams.",
 "Nhật Ký Thực Hiện": "Progress Log",
 "Nhật Ký Hành Trình (Journey Timeline)": "Journey Timeline",
 "Tiến trình triển khai dự án theo từng tuần của nhóm nghiên cứu Pipe Traffic HCMUS": "The weekly implementation progress of the Pipe Traffic HCMUS research team",
 "Tuần 1": "Week 1",
 "Khởi Tạo & Định Hình Dự Án": "Project Kick-off & Definition",
 "Họp nhóm phân công vai trò, thành lập": "Team meeting to assign roles and set up the",
 "Hợp đồng nhóm": "team charter",
 "Thống nhất quy tắc làm việc và kênh giao tiếp chung.": "Agree on working rules and a shared communication channel.",
 "đảm nhận thiết kế Logo nhóm.": "is in charge of designing the team logo.",
 "Brainstorming ý tưởng giải pháp giao thông đường ống từ trường.": "Brainstorm ideas for a magnetic pipe transport solution.",
 "T1": "W1",
 "T2": "W2",
 "Tuần 2": "Week 2",
 "Nghiên Cứu & Thiết Kế Giải Pháp": "Research & Solution Design",
 "Phân tích bài toán giao thông urban/không gian hẹp đô thị.": "Analyse the urban/narrow-space traffic problem.",
 "Hoàn thiện cấu trúc nội dung 4 phần:": "Finalise the 4-part content structure:",
 "Phác thảo sơ đồ đường ống nhiều tầng và tích hợp AI điều hướng.": "Sketch the multi-level pipe diagram and integrate the AI routing.",
 "Thu thập tư liệu và lên kịch bản kịch tính dựng Video giới thiệu.": "Collect materials and script the introduction video.",
 "Tuần 3": "Week 3",
 "Xây Dựng Website & Dựng Video": "Website Building & Video Production",
 "Tạo và hoàn thiện cấu trúc Website nhóm mã nguồn chuẩn trên nền tảng Web.": "Build and finalise the team website's structure with standard source code on the Web platform.",
 "Dựng và edit hoàn chỉnh Video demo / giới thiệu dự án.": "Produce and fully edit the project demo / introduction video.",
 "Kiểm thử tính năng, rà soát toàn bộ nội dung và chuẩn bị báo cáo hoàn thành.": "Test features, review all content and prepare the completion report.",
 "T3": "W3",
 "Nội Dung Chuyên Môn": "Specialist Content",
 "Bài Toán & Giải Pháp (Problems)": "Problems & Solutions",
 "4.1 Tóm Tắt Đề Tài (Abstract)": "4.1 Project Summary (Abstract)",
 "Hiện nay, các đô thị lớn phải đối mặt với tình trạng tắc nghẽn giao thông nghiêm trọng và quỹ đất hạ tầng vô cùng hạn hẹp.": "Today, large cities face severe traffic congestion and extremely limited land for infrastructure.",
 "là đề xuất về một hệ thống phương tiện giao thông chạy bằng": "is a proposal for a transport system powered by",
 "từ trường (magnetic levitation/propulsion)": "magnetic fields (magnetic levitation/propulsion)",
 "được lắp đặt trực tiếp tại các hộ gia đình và tòa nhà.": "installed directly in households and buildings.",
 "Hệ thống giúp di chuyển nhanh chóng, an toàn, không phát thải và tối ưu hóa diện tích không gian đô thị nén.": "The system enables fast, safe, zero-emission travel and optimises space in compact cities.",
 "4.2 Giải Pháp Đột Phá (Solution)": "4.2 Breakthrough Solution",
 "Cấu trúc ống trượt đa tầng:": "Multi-level sliding pipe structure:",
 "Đường ống trượt chạy bằng lực từ tính được chia thành nhiều tầng riêng biệt, kết nối linh hoạt từ nhà này sang nhà khác hoặc từ hộ gia đình đến các trục chính đô thị.": "Magnetically driven sliding pipes are divided into separate levels, flexibly linking one house to another or households to the main urban arteries.",
 "Tối ưu không gian hẹp & Chi phí:": "Optimising tight space & cost:",
 "Không tốn diện tích giải phóng mặt bằng hay chi phí xây dựng đường ray/đường nhựa truyền thống đắt đỏ.": "No land-clearance area or costly construction of traditional rails/roads is needed.",
 "Tích hợp Trí tuệ nhân tạo (AI):": "Artificial Intelligence (AI) integration:",
 "Tự động tính toán khoảng cách an toàn, điều phối luồng xe chạy liên tục. Đồng thời tự động ưu tiên làn đường và giải phóng lộ trình trong trường hợp khẩn cấp (cấp cứu, cứu hỏa, lực lượng chức năng).": "Automatically calculates safe distances and keeps traffic flowing continuously. It also prioritises lanes and clears the route in emergencies (ambulances, fire engines, authorities).",
 "4.3 Phương Pháp Triển Khai (Methods)": "4.3 Implementation Methods",
 "Quy hoạch & Xây dựng:": "Planning & construction:",
 "Tiến hành đào và thi công hệ thống đường ống ngầm/trên cao dưới sự giám sát và cấp phép của": "Excavation and construction of the underground/elevated pipe system are carried out under the supervision and licensing of",
 "Bộ Xây dựng": "the Ministry of Construction",
 "và các cơ quan quản lý giao thông.": "and traffic management authorities.",
 "Tiết kiệm chi phí:": "Cost savings:",
 "Sử dụng vật liệu mô-đun hóa hiện đại, sản xuất hàng loạt giúp giảm giá thành lắp đặt.": "Using modern modular materials and mass production to reduce installation costs.",
 "An toàn & Luật định:": "Safety & regulations:",
 "Tuân thủ chặt chẽ các nguyên tắc và quy chuẩn an toàn giao thông hiện hành, tích hợp hệ thống hãm từ tính khẩn cấp và cảm biến đa điểm.": "Strictly complies with current traffic safety principles and standards, integrating an emergency magnetic braking system and multi-point sensors.",
 "4.4 Kết Luận (Conclusions)": "4.4 Conclusions",
 "đem đến một góc nhìn đột phá cho tương lai hạ tầng giao thông đô thị.": "offers a breakthrough perspective on the future of urban transport infrastructure.",
 "Việc ứng dụng công nghệ từ trường kết hợp cùng AI quản lý luồng chạy không chỉ giải quyết triệt để bài toán kẹt xe và diện tích đô thị hẹp, mà còn tạo ra phương thức di chuyển xanh, bền vững và tiết kiệm tối đa chi phí xây dựng cho xã hội.": "Applying magnetic technology together with AI flow management not only thoroughly solves traffic jams and limited urban space, but also creates a green, sustainable way to travel with maximum savings in construction costs for society.",
 "Đội Ngũ Phát Triển": "Development Team",
 "Thành Viên Nhóm & Hợp Đồng Quy Tắc": "Team Members & Charter of Rules",
 "Đại học Khoa học Tự nhiên - ĐHQG TP.HCM (HCMUS)": "University of Science – VNU-HCM (HCMUS)",
 "Thiết kế Logo nhóm, làm mind map, thuyết trình mind map.": "Designed the team logo, made the mind map, presented the mind map.",
 "Chi tiết": "Details",
 "Cấu hình & dựng cấu trúc Website, làm mind map.": "Configured and built the website structure, made the mind map.",
 "Chủ ý tưởng Pipe Traffic, làm mind map, phát triển dự án.": "Originator of the Pipe Traffic idea, made the mind map, developed the project.",
 "Media & Video Producer": "Media & Video Producer",
 "Biên bản họp, dựng video demo và hậu kỳ truyền thông, mind map.": "Meeting minutes, demo video editing and media post-production, mind map.",
 "Điều phối tiến độ, Hợp đồng nhóm, Quy tắc & tổng hợp tài liệu.": "Coordinates progress, team charter, rules & document compilation.",
 "3.2 Hợp Đồng Thành Lập, Quy Tắc & Kế Hoạch Giao Tiếp Nhóm": "3.2 Founding Charter, Rules & Team Communication Plan",
 "Cam kết làm việc chuyên nghiệp của sinh viên Trường Đại học Khoa học Tự nhiên.": "A professional working commitment by students of the University of Science.",
 "A. Hợp Đồng Thành Lập Nhóm": "A. Team Founding Charter",
 "Tên dự án:": "Project name:",
 "Mục tiêu chung:": "Common goal:",
 "Hoàn thành xuất sắc bài tập nhóm, xây dựng nguyên mẫu ý tưởng dự án thực tế, đúng thời hạn 100%.": "Complete the group assignment excellently and build a prototype of a real project idea, 100% on time.",
 "Cam kết thành viên:": "Member commitments:",
 "Tham gia đầy đủ các buổi họp online & offline.": "Attend all online & offline meetings.",
 "Tôn trọng ý kiến đóng góp, thảo luận tinh thần xây dựng.": "Respect contributions and discuss in a constructive spirit.",
 "Đảm bảo chất lượng công việc đúng cam kết deadline.": "Ensure work quality meets the committed deadlines.",
 "B. Quy Tắc Làm Việc Nhóm": "B. Team Working Rules",
 "Đúng hạn (Punctuality):": "Punctuality:",
 "Nộp sản phẩm trước deadline ít nhất 6 tiếng để kiểm tra chéo.": "Submit work at least 6 hours before the deadline for cross-checking.",
 "Minh bạch (Transparency):": "Transparency:",
 "Khó khăn phát sinh phải thông báo ngay lên kênh chung trong vòng 12 tiếng.": "Any difficulty must be reported to the shared channel within 12 hours.",
 "Đóng góp tích cực:": "Active contribution:",
 "Mỗi thành viên bắt buộc đưa ra ít nhất 1 ý kiến đóng góp trong mỗi buổi họp.": "Each member must give at least 1 suggestion in every meeting.",
 "Thẩm quyền quyết định:": "Decision authority:",
 "Đa số bỏ phiếu; trường hợp hòa, Project Manager ra quyết định cuối cùng.": "Majority vote; in a tie, the Project Manager makes the final decision.",
 "C. Kế Hoạch Giao Tiếp": "C. Communication Plan",
 "Kênh trao đổi chính:": "Main channel:",
 "Zalo / Discord Group (Nhắn tin hàng ngày, thông báo gấp).": "Zalo / Discord Group (daily messaging, urgent announcements).",
 "Quản lý tài liệu & Task:": "Document & task management:",
 "Google Drive (Lưu trữ), Trello / Notion (Theo dõi tiến độ).": "Google Drive (storage), Trello / Notion (progress tracking).",
 "Lịch họp định kỳ:": "Regular meeting schedule:",
 "Check-in Online:": "Online check-in:",
 "21:00 Thứ Tư hàng tuần (30 phút).": "21:00 every Wednesday (30 minutes).",
 "Họp Tổng kết:": "Wrap-up meeting:",
 "14:00 Chủ Nhật hàng tuần.": "14:00 every Sunday.",
 "Bình luận": "Comments",
 "Tên thật": "Real name",
 "Ẩn danh": "Anonymous",
 "5/5 Sao": "5/5 Stars",
 "Đánh Giá & Giải Đáp": "Reviews & Answers",
 "Review Chuyên Gia & Câu Hỏi Thường Gặp": "Expert Reviews & Frequently Asked Questions",
 "\"Ý tưởng lắp đặt đường ống trượt từ trường tận hộ gia đình mang tính tiên phong rất cao cho không gian hẹp đô thị.\"": "\"The idea of installing magnetic sliding pipes right to households is highly pioneering for narrow urban spaces.\"",
 "TS. Nguyễn Gia Khánh": "Dr. Nguyễn Gia Khánh",
 "Chuyên gia Quy hoạch Hạ tầng": "Infrastructure Planning Expert",
 "\"Việc kết hợp AI điều hướng khẩn cấp giúp loại bỏ hoàn toàn hiện tượng ùn tắc và đảm bảo an toàn tuyệt đối.\"": "\"Combining emergency AI routing eliminates congestion entirely and ensures absolute safety.\"",
 "Kỹ sư Giao thông Đô thị": "Urban Traffic Engineer",
 "\"Tiết kiệm chi phí đền bù giải phóng mặt bằng so với dự án Metro truyền thống là điểm cộng lớn nhất.\"": "\"Saving on land-clearance compensation compared with traditional Metro projects is the biggest plus.\"",
 "Đại diện Quỹ Đầu Tư Công Nghệ": "Representative of a Technology Investment Fund",
 "1. Hệ thống đường ống trượt từ trường hoạt động như thế nào tại nhà?": "1. How does the magnetic sliding pipe system work at home?",
 "Đường ống trượt từ tính được lắp đặt mô-đun hóa nối trực tiếp tới cổng hộ gia đình hoặc tầng kỹ thuật tòa nhà. Cabin di chuyển nhờ lực đẩy đệm từ không ma sát.": "Modular magnetic sliding pipes connect directly to the household gate or a building's technical floor. Cabins move by frictionless magnetic-cushion propulsion.",
 "2. Thuật toán AI xử lý tình huống khẩn cấp ra sao?": "2. How does the AI algorithm handle emergencies?",
 "AI liên tục đo khoảng cách an toàn thời gian thực giữa các cabin. Khi có tín hiệu ưu tiên (cấp cứu, cứu hỏa), AI tự động di chuyển các cabin thường sang tầng ống phụ để mở lộ trình trống ngay lập tức.": "The AI continuously measures real-time safe distances between cabins. When a priority signal arrives (ambulance, fire engine), the AI automatically moves ordinary cabins to the auxiliary pipe level to open a clear route instantly.",
 "3. Dự án tuân thủ theo cơ quan quản lý nào?": "3. Which regulatory authority does the project comply with?",
 "Toàn bộ phương pháp triển khai thi công đường ống ngầm/trên cao đều được thiết kế tuân thủ nghiêm ngặt theo các quy chuẩn an toàn do": "All underground/elevated pipe construction methods are designed to strictly follow the safety standards licensed by",
 "cấp phép.": "licensing.",
 "Tương Tác Cùng Nhóm Nghiên Cứu": "Interact With the Research Team",
 "Góp Ý & Bình Luận Cho Dự Án Pipe Traffic": "Feedback & Comments for the Pipe Traffic Project",
 "Mọi nhận xét của bạn sẽ đóng góp quan trọng cho sự phát triển của giải pháp giao thông đường ống.": "Every comment you make is an important contribution to developing the pipe transport solution.",
 "Bảng Đóng Góp Ý Kiến": "Feedback Board",
 "Công khai / Ẩn danh": "Public / Anonymous",
 "Chế độ danh tính": "Identity mode",
 "Tên Thật": "Real Name",
 "Ẩn Danh": "Anonymous",
 "Họ & Tên": "Full name",
 "Email / Vai trò (Tùy chọn)": "Email / Role (optional)",
 "Đánh giá mức độ khả thi": "Feasibility rating",
 "Nội dung bình luận": "Comment content",
 "🚀 Đột phá": "🚀 Breakthrough",
 "💡 Ý tưởng hay": "💡 Great idea",
 "👏 Ủng hộ": "👏 Support",
 "❓ Thắc mắc": "❓ Question",
 "Gửi Bình Luận Ngay": "Send Comment Now",
 "Ý Kiến Đóng Góp Từ Cộng Đồng": "Community Feedback",
 "Làm mới dữ liệu": "Refresh data",
 "Dự án nghiên cứu · HCMUS": "Research project · HCMUS",
 "Cùng Tiên Phong": "Pioneering Together",
 "Tương Lai Giao Thông Thông Minh": "The Future of Smart Transport",
 "Đang tải": "Loading",
 "Mở menu": "Open menu",
 "Tìm trong website…": "Search the website…",
 "Tìm kiếm": "Search",
 "Mở khung chat": "Open chat",
 "Khung chat": "Chat window",
 "Đóng khung chat": "Close chat window",
 "Nhập tin nhắn…": "Type a message…",
 "Giới thiệu Pipe Traffic": "About Pipe Traffic",
 "Thông báo cookie": "Cookie notice",
 "Logo Pipe Traffic": "Pipe Traffic logo",
 "Ùn tắc giao thông đô thị": "Urban traffic congestion",
 "Giải pháp giao thông": "Transport solution",
 "Phương pháp triển khai": "Implementation method",
 "Đô thị về đêm": "City at night",
 "Làm mới bình luận": "Refresh comments",
 "Làm mới": "Refresh",
 "Họ & tên *": "Full name *",
 "Vai trò (tuỳ chọn)": "Role (optional)",
 "Viết bình luận hoặc góp ý cho Pipe Traffic...": "Write a comment or feedback for Pipe Traffic...",
 "Nhập tên của bạn...": "Enter your name...",
 "Ví dụ: Sinh viên HCMUS, Kỹ sư, Khách...": "Example: HCMUS student, Engineer, Guest...",
 "Nhập nhận xét, câu hỏi hoặc ý kiến đóng góp cho Pipe Traffic...": "Enter a comment, question or feedback for Pipe Traffic..."
};

  /* ---------- Từ điển 2: chữ do JavaScript tạo ra (trang dự án, đăng nhập, chat, tìm kiếm, video, liên hệ...) ---------- */
  const DYN = {
    // --- Banner nhiều bước, bình luận gọn, hướng dẫn sử dụng ---
    "Hướng Dẫn Sử Dụng": "User Guide",
    "Hướng dẫn sử dụng": "User guide",
    "Tính năng & so sánh hạ tầng": "Features & infrastructure comparison",
    "Bỏ qua": "Skip",
    "← Quay lại": "← Back",
    "Tiếp theo →": "Next →",
    "Viết bình luận…": "Write a comment…",
    "Tên của bạn (để trống = Ẩn danh)": "Your name (leave empty = Anonymous)",
    "Chưa có bình luận nào. Hãy là người đầu tiên!": "No comments yet. Be the first!",
    "Đang tải bình luận…": "Loading comments…",
    "Chưa tải được bình luận.": "Could not load comments.",
    "Admin Pipe Traffic": "Pipe Traffic Admin",
    // --- Nút giao diện tối / ngôn ngữ ---
    'Chế độ tối': 'Dark mode', 'Chế độ sáng': 'Light mode',
    'Chuyển sang giao diện tối': 'Switch to dark theme', 'Chuyển sang giao diện sáng': 'Switch to light theme',
    'Quản trị': 'Admin panel', 'Khu vực quản trị': 'Admin area',
    // --- Điều hướng, tài khoản ---
    'Đăng nhập': 'Log in', 'Thoát': 'Log out', 'Đổi avatar': 'Change avatar', 'Hồ sơ và avatar': 'Profile and avatar',
    'Mô Phỏng Hệ Thống': 'System Simulation', 'Hồ sơ': 'Profile',
    'Tắt thông báo': 'Turn off notifications', 'Thông báo đang bị chặn': 'Notifications are blocked',
    'Trình duyệt chưa hỗ trợ thông báo': "Your browser doesn't support notifications",
    'Đã bật thông báo.': 'Notifications turned on.', 'Đã tắt thông báo.': 'Notifications turned off.',
    'Bạn chưa cho phép thông báo.': "You haven't allowed notifications.", 'Trình duyệt này chưa hỗ trợ thông báo.': "This browser doesn't support notifications.",
    'Thông báo đang bị chặn: bấm biểu tượng ổ khoá cạnh địa chỉ trang, cho phép "Thông báo" rồi thử lại.': 'Notifications are blocked: click the lock icon next to the address bar, allow "Notifications" and try again.',
    // --- Trang chủ / dự án ---
    'Đang tải…': 'Loading…', 'Đang tải dự án…': 'Loading projects…', 'Các dự án': 'Projects',
    'Dự án Pipe Traffic do nhóm sinh viên Trường Đại học Khoa học Tự nhiên (HCMUS) nghiên cứu và phát triển.': 'The Pipe Traffic project is researched and developed by students of the University of Science (HCMUS).',
    'Xem Đồ Án Chi Tiết': 'View Project Details', 'Liên Hệ Nhóm Dự Án': 'Contact the Project Team',
    'Chế độ thử: tài khoản, dự án và tin nhắn chỉ lưu trên trình duyệt này. Điền Firebase trong config.js để dùng chung (xem README).': 'Demo mode: accounts, projects and messages are stored only in this browser. Fill in Firebase in config.js to share data (see README).',
    'Chưa có dự án nào.': 'No projects yet.', 'Không tìm thấy dự án.': 'Project not found.', 'Quay lại': 'Go back',
    '← Tất cả dự án': '← All projects', 'Cập nhật theo tuần': 'Weekly updates', 'Chưa có cập nhật.': 'No updates yet.',
    'Hoàn thành': 'Completed', 'Đang làm': 'In progress', 'Kế hoạch': 'Planned', 'Tạm dừng': 'On hold',
    // --- Đăng nhập / đăng ký ---
    'Bước 1: đăng nhập Google (bắt buộc).': 'Step 1: sign in with Google (required).', 'Tiếp tục với Google': 'Continue with Google',
    'Mật khẩu': 'Password', 'Quên mật khẩu?': 'Forgot password?', 'Tài khoản mới. Bước 2: điền thông tin.': 'New account. Step 2: fill in your details.',
    'Hãy đặt mật khẩu cho tài khoản.': 'Please set a password for your account.', 'Tên hiển thị': 'Display name', 'Giới tính': 'Gender',
    'Nam': 'Male', 'Nữ': 'Female', 'Khác': 'Other', 'Mật khẩu (từ 6 ký tự)': 'Password (at least 6 characters)',
    'Tạo tài khoản': 'Create account', 'Lưu mật khẩu': 'Save password', 'Sai mật khẩu.': 'Wrong password.',
    // --- Cam kết quyền riêng tư ---
    'Cam kết quyền riêng tư': 'Privacy Commitment', 'Vui lòng đọc và đồng ý trước khi sử dụng tài khoản.': 'Please read and agree before using your account.',
    'Thông tin thu thập': 'Information collected', 'Tên hiển thị, giới tính và email Google.': 'Display name, gender and Google email.',
    'Mục đích sử dụng': 'Purpose of use', 'Chỉ để quản lý tài khoản và hỗ trợ bạn trong phạm vi dự án Pipe Traffic.': 'Only to manage your account and support you within the Pipe Traffic project.',
    'Không chia sẻ': 'No sharing', 'Không bán hay chuyển cho bên thứ ba khi chưa có sự đồng ý của bạn.': 'Never sold or passed to third parties without your consent.',
    'Quyền của bạn': 'Your rights', 'Xem, sửa ở trang Hồ sơ hoặc yêu cầu xoá bất cứ lúc nào qua tin nhắn cho admin.': 'View and edit on the Profile page, or ask for deletion at any time by messaging the admin.',
    'Tôi đã đọc và đồng ý với cam kết quyền riêng tư.': 'I have read and agree to the privacy commitment.', 'Đồng ý và tiếp tục': 'Agree and continue',
    'Không đồng ý, huỷ đăng ký': 'Disagree, cancel registration', 'Cảm ơn bạn đã đồng ý': 'Thank you for agreeing', 'Đã huỷ đăng ký': 'Registration cancelled',
    // --- Hồ sơ ---
    '← Trang chính': '← Home', 'Chọn avatar': 'Choose avatar', 'Xoá ảnh': 'Remove photo',
    'Ảnh được cắt vuông và thu nhỏ tự động, hiện cạnh tin nhắn của bạn trong khung chat.': 'Photos are automatically cropped square and resized, and shown next to your messages in the chat.',
    'Thông tin cá nhân': 'Personal information', 'Email (đăng nhập Google, không đổi được)': 'Email (Google sign-in, cannot be changed)',
    'Lưu thông tin': 'Save information', 'Đang lưu…': 'Saving…', 'Đã cập nhật avatar': 'Avatar updated', 'Đã xoá avatar': 'Avatar removed',
    'Đã cập nhật thông tin': 'Information updated', 'Tên hiển thị không được để trống.': 'Display name cannot be empty.',
    // --- Khung chat ---
    'Đăng nhập để nhắn tin cho admin.': 'Log in to message the admin.', 'Chưa có tin nhắn. Hãy gửi tin đầu tiên.': 'No messages yet. Send the first one.',
    'Xin chào! Mình là trợ lý ảo của Pipe Traffic. Bạn muốn hỏi gì?': "Hello! I'm the Pipe Traffic virtual assistant. What would you like to ask?",
    'Trợ lý sẽ được thêm sau.': 'The assistant will be added later.', 'Hỏi trợ lý về Pipe Traffic…': 'Ask the assistant about Pipe Traffic…',
    'Trợ lý sẽ được thêm sau': 'The assistant will be added later', 'Đăng nhập để nhắn tin cho admin': 'Log in to message the admin',
    'Nhắn cho admin…': 'Message the admin…', 'Trợ lý ảo Pipe Traffic': 'Pipe Traffic Virtual Assistant', 'Luôn sẵn sàng trả lời': 'Always ready to answer',
    'Nhắn cho admin, bạn sẽ được phản hồi sớm nhất': "Message the admin and you'll get a reply as soon as possible",
    'Pipe Traffic là gì?': 'What is Pipe Traffic?', 'Hệ thống hoạt động thế nào?': 'How does the system work?', 'So với Metro khác gì?': 'How is it different from the Metro?',
    'Nhóm có những ai?': 'Who is on the team?', 'Tiến độ các tuần': 'Weekly progress', 'Liên hệ nhóm': 'Contact the team',
    'Tin nhắn đã được thu hồi': 'Message unsent', 'Yêu thích': 'Love', 'Buồn': 'Sad', 'Thả cảm xúc': 'React', 'Thả cảm xúc / thu hồi': 'React / unsend',
    'Thả cảm xúc hoặc thu hồi': 'React or unsend', 'Thu hồi tin nhắn': 'Unsend message', '↩ Thu hồi': '↩ Unsend', 'Thu hồi': 'Unsend',
    'Hãy đăng nhập để thả cảm xúc': 'Log in to react', 'Chưa thả được cảm xúc': "Couldn't add the reaction",
    // --- Đính kèm, ghi âm ---
    'Chèn emoji': 'Insert emoji', 'Ghi âm tin nhắn thoại': 'Record a voice message',
    'Đính kèm hình ảnh, tệp hoặc video (cũng có thể kéo thả hoặc Ctrl+V)': 'Attach an image, file or video (you can also drag and drop or press Ctrl+V)',
    'Gửi hình ảnh': 'Send an image', '🖼️ Gửi hình ảnh': '🖼️ Send an image', '📄 Gửi tệp': '📄 Send a file',
    '🎬 Gửi video (tối đa 6 MB)': '🎬 Send a video (max 6 MB)', 'Đang ghi âm…': 'Recording…', 'Huỷ ghi âm': 'Cancel recording', 'Huỷ': 'Cancel',
    'Bỏ tệp này': 'Remove this file', 'Gửi lượt thích': 'Send a like', 'Ảnh đính kèm': 'Attached image', 'Thả ảnh / video / tệp vào đây': 'Drop images / videos / files here',
    'Tin nhắn thoại quá ngắn': 'Voice message too short', 'Trình duyệt chưa hỗ trợ ghi âm': "This browser doesn't support recording",
    'Không bật được micro. Hãy cho phép trang dùng micro (cần mở bằng HTTPS).': "Couldn't turn on the microphone. Allow the page to use it (needs HTTPS).",
    'Định dạng video chưa hỗ trợ (hãy dùng MP4 hoặc WebM)': 'Unsupported video format (please use MP4 or WebM)',
    'Tệp quá lớn để gửi trong chat. Hãy đưa lên YouTube/Drive rồi dán link.': 'File too large to send in chat. Upload it to YouTube/Drive and paste the link.',
    'Ảnh quá nặng cho một tin nhắn, hãy gửi ít ảnh hơn.': 'Images are too large for one message, please send fewer images.',
    // --- Bình luận ---
    'Chưa có bình luận nào được hiển thị. Hãy là người đầu tiên!': 'No comments to show yet. Be the first!', 'Đang tải bình luận…': 'Loading comments…',
    'Chưa tải được bình luận lúc này.': 'Could not load comments right now.', 'Thử lại': 'Try again',
    'Vui lòng nhập họ tên hoặc chọn Ẩn danh': 'Please enter your name or choose Anonymous', 'Hãy nhập nội dung bình luận': 'Please write your comment',
    'Bạn gửi hơi nhanh, đợi vài giây nhé': "You're sending too fast, please wait a few seconds", 'Đang gửi…': 'Sending…',
    'Đã gửi! Bình luận sẽ hiện sau khi quản trị viên duyệt.': 'Sent! Your comment will appear after the admin approves it.',
    'Vui lòng thử lại sau ít phút.': 'Please try again in a few minutes.',
    // --- Tìm kiếm ---
    'Trang chủ': 'Home', 'Dự án': 'Projects', 'Kỹ thuật & hạ tầng': 'Technical & infrastructure', 'Hành trình': 'Journey', 'Thành viên & quy tắc': 'Team & rules',
    'Bài toán & giải pháp': 'Problem & solution', 'Video demo': 'Demo video', 'Đánh giá & FAQ': 'Reviews & FAQ', 'Mô phỏng': 'Simulation',
    'Tìm': 'Search', 'Nhập từ cần tìm rồi nhấn Enter…': 'Type a keyword and press Enter…', 'Tìm trong website… (nhấn Enter)': 'Search the website… (press Enter)',
    'Gõ không dấu cũng được · Esc để đóng · phím tắt: / hoặc Ctrl+K': 'Accents optional · Esc to close · shortcut: / or Ctrl+K',
    'Nhập từ khoá để tìm trong toàn bộ website.': 'Enter a keyword to search the whole website.', 'Tất cả': 'All', 'Đang tìm…': 'Searching…',
    'Tìm thấy': 'Found', 'kết quả trong': 'results in', 'Không có kết quả nào cho “': 'No results for “',
    'Thử từ ngắn hơn hoặc đổi cách viết. Bạn cũng có thể vào thẳng một trang:': 'Try a shorter word or a different spelling. You can also go straight to a page:',
    // --- Video demo (nội dung mẫu) ---
    'Truyền Thông Dự Án': 'Project Media', 'Video Giới Thiệu & Kịch Bản Đô Thị': 'Introduction Video & Urban Scenario',
    'Xem Video Demo Nguyên Lý Hoạt Động Pipe Traffic': 'Watch the Pipe Traffic Operating Principle Demo', 'Sản phẩm truyền thông nhóm sinh viên HCMUS': 'Media product by the HCMUS student team',
    'Kịch Bản Phân Cảnh Video (5 Scenes)': 'Video Storyboard (5 Scenes)',
    'Cảnh tắc đường đô thị giờ cao điểm.': 'Rush-hour urban traffic jam.',
    'Tắc nghẽn giao thông, diện tích đất hạn hẹp và ô nhiễm – bài toán chưa có lời giải.': 'Traffic congestion, limited land and pollution – a problem with no solution yet.',
    'Logo Pipe Traffic xuất hiện (Giàu thiết kế). Mô hình 3D đường ống kết nối giữa các tòa nhà đô thị.': 'The Pipe Traffic logo appears (designed by Giàu). A 3D model of pipes linking urban buildings.',
    'Mô phỏng đường ống đa tầng, cabin trượt đệm từ tính và thuật toán AI tự động điều phối khoảng cách khẩn cấp.': 'Simulation of the multi-level pipes, magnetic-cushion cabins and the AI algorithm automatically managing emergency distances.',
    'Sơ đồ thi công chuẩn quy chuẩn Bộ Xây dựng và hình ảnh 5 thành viên nhóm HCMUS thảo luận làm việc.': 'Construction diagram following Ministry of Construction standards and images of the 5 HCMUS team members discussing their work.',
    'Slide kết thúc: Logo nhóm + Tên 5 thành viên + Thông điệp': 'Closing slide: team logo + names of the 5 members + the message',
    'Pipe Traffic – Kết nối không giới hạn': 'Pipe Traffic – Limitless connection',
    // --- Liên hệ (nội dung mẫu) ---
    'Pipe Traffic Dev Team – sinh viên Trường Đại học Khoa học Tự nhiên TP.HCM (HCMUS). Bạn muốn góp ý hoặc hợp tác, hãy liên hệ nhóm qua các kênh dưới đây.': "Pipe Traffic Dev Team – students of the University of Science, Ho Chi Minh City (HCMUS). If you'd like to give feedback or collaborate, reach the team through the channels below.",
    'Trường': 'School', 'Đại học Khoa học Tự nhiên, ĐHQG-HCM': 'University of Science, VNU-HCM',
    // --- Trang Mô phỏng ---
    'Xem Pipe Traffic Vận Hành': 'See Pipe Traffic in Action',
    'Mô phỏng đơn giản: các cabin chạy trong ống đa tầng giữa các tòa nhà. Bấm nút bên dưới để thử tình huống khẩn cấp.': 'A simple simulation: cabins run through multi-level pipes between buildings. Press the button below to try an emergency.',
    'Tầng 1 · Tuyến nhanh': 'Level 1 · Express', 'Tầng 2 · Tuyến thường': 'Level 2 · Regular', 'Tầng phụ · Nhường đường': 'Auxiliary level · Giving way',
    'Nhà ở': 'Homes', 'Tòa nhà': 'Building', 'Trung tâm': 'Centre', 'Xe cấp cứu': 'Ambulance',
    '🚑 Kích hoạt xe cấp cứu': '🚑 Trigger an ambulance', '✅ Tắt tình huống khẩn cấp': '✅ End the emergency',
    'Bình thường: các cabin chạy liên tục, AI giữ khoảng cách an toàn.': 'Normal: cabins run continuously and the AI keeps safe distances.',
    'Khẩn cấp: AI đưa các cabin thường xuống tầng phụ để xe cấp cứu đi thông suốt.': 'Emergency: the AI moves ordinary cabins to the auxiliary level so the ambulance passes freely.',
    'Ống đa tầng': 'Multi-level pipes', 'Mỗi tầng ống là một tuyến riêng, nối nhà với nhà và với trục chính.': 'Each pipe level is its own route, linking homes to each other and to the main artery.',
    'Cabin từ trường': 'Magnetic cabins', 'Trượt bằng lực từ, không ma sát nên êm và nhanh.': 'They glide on magnetic force with no friction, so they are smooth and fast.',
    'AI nhường đường': 'AI gives way', 'Tự đo khoảng cách và dọn đường khi có xe ưu tiên.': 'It measures distances itself and clears the route for priority vehicles.',
    'Rê chuột vào nút ☰ để mở menu': 'Hover over the ☰ button to open the menu', 'Chạm vào nút ☰ để mở menu': 'Tap the ☰ button to open the menu',
    // --- Câu đầy đủ dùng cho trợ lý ảo (khi nội dung lấy từ dữ liệu, không có thẻ in đậm) ---
    'Họp nhóm phân công vai trò, thành lập Hợp đồng nhóm.': 'Team meeting to assign roles and set up the team charter.',
    'Nguyễn Giàu đảm nhận thiết kế Logo nhóm.': 'Nguyễn Giàu is in charge of designing the team logo.',
    'Hoàn thiện cấu trúc nội dung 4 phần: Abstract, Solution, Methods, Conclusions.': 'Finalise the 4-part content structure: Abstract, Solution, Methods, Conclusions.',
    'Toàn bộ phương pháp triển khai thi công đường ống ngầm/trên cao đều được thiết kế tuân thủ nghiêm ngặt theo các quy chuẩn an toàn do Bộ Xây dựng cấp phép.': 'All underground/elevated pipe construction methods are designed to strictly follow the safety standards licensed by the Ministry of Construction.'
  };
  const DICT = Object.assign({}, STATIC, DYN);

  /* ---------- Quy tắc cho câu có phần thay đổi (số, tên, lỗi...) ---------- */
  const RULES = [
    [/^(\d+)% hoàn thành$/, '$1% complete'],
    [/^Chưa tải được dự án: (.*)$/, 'Could not load projects: $1'],
    [/^Chủ dự án: (.*)$/, 'Project owner: $1'],
    [/^Đăng nhập Google chưa thành công: (.*)$/, 'Google sign-in was not successful: $1'],
    [/^Đã gửi email đặt lại mật khẩu tới (.*)$/, 'A password reset email was sent to $1'],
    [/^Không gửi được email: (.*)$/, 'Could not send the email: $1'],
    [/^Xin chào (.+)$/, 'Hello $1'],
    [/^Admin trả lời vừa xong$/, 'Admin replied just now'],
    [/^Admin trả lời (\d+) phút trước$/, 'Admin replied $1 min ago'],
    [/^Admin trả lời (\d+) giờ trước$/, 'Admin replied $1 h ago'],
    [/^Admin trả lời (\d+) ngày trước$/, 'Admin replied $1 d ago'],
    [/^Hôm nay (.+)$/, 'Today $1'], [/^Hôm qua (.+)$/, 'Yesterday $1'],
    [/^Gửi chưa được: (.*)$/, 'Could not send: $1'], [/^Gửi chưa được\. (.*)$/, 'Could not send. $1'],
    [/^Chưa lưu được: (.*)\. Nếu lỗi là "permission", admin cần cập nhật Firestore Rules để cho phép người dùng sửa hồ sơ của mình\.$/, 'Could not save: $1. If the error says "permission", the admin must update the Firestore Rules to let users edit their own profile.'],
    [/^Lỗi tải dữ liệu: (.*)$/, 'Error loading data: $1'],
    [/^(\d)\/5 Sao$/, '$1/5 Stars'],
    [/^▶ Xem video(.*)$/, '▶ Watch video$1'], [/^🎤 Nghe · (.*)$/, '🎤 Listen · $1'],
    [/^Tối đa (\d+) tệp mỗi tin nhắn$/, 'Maximum $1 files per message'],
    [/^Video "(.*)" nặng (.*), tối đa (.*)\. Video dài hơn hãy đưa lên YouTube\/Drive rồi dán link\.$/, 'Video "$1" is $2; the maximum is $3. For longer videos, upload to YouTube/Drive and paste the link.'],
    [/^Tệp "(.*)" nặng (.*), tối đa (.*)\. Tệp lớn hơn hãy đưa lên Google Drive rồi dán link\.$/, 'File "$1" is $2; the maximum is $3. For larger files, upload to Google Drive and paste the link.'],
    [/^Không gửi loại tệp "(.*)" vì lý do an toàn\.$/, 'Files of type "$1" are not sent for safety reasons.'],
    [/^trang cho (.*)$/, 'pages for $1'],
    [/^(\d+) kết quả$/, '$1 results'],
    [/^Xem thêm (\d+) kết quả$/, 'Show $1 more results'],
    [/^Xem tất cả (\d+) kết quả cho (.*)$/, 'View all $1 results for $2'],
    [/^Không có gợi ý cho (.*)\. Nhấn Enter để tìm trên toàn trang\.$/, 'No suggestions for $1. Press Enter to search the whole site.']
  ];

  /* ---------- Hàm dịch một đoạn chữ ---------- */
  function lookup(k) {
    if (Object.prototype.hasOwnProperty.call(DICT, k)) return DICT[k];
    for (const [re, rep] of RULES) if (re.test(k)) return k.replace(re, rep);
    return undefined;
  }
  function tr(s) {
    s = String(s == null ? '' : s);
    const k = norm(s); if (!k) return s;
    let r = lookup(k);
    if (r === undefined && k.length > 2 && k[0] === '"' && k[k.length - 1] === '"') { const q = lookup(k.slice(1, -1)); if (q !== undefined) r = '"' + q + '"'; }   // câu nằm trong ngoặc kép
    if (r === undefined) return s;
    const lead = /^\s*/.exec(s)[0], trail = /\s*$/.exec(s)[0];
    return r[0] === '^' ? r.slice(1) + trail : lead + r + trail;     // giữ nguyên khoảng trắng đầu / cuối
  }

  /* ---------- Quét và thay chữ trên trang ---------- */
  const ATTRS = ['placeholder', 'title', 'aria-label', 'alt', 'data-drop'], SEL = ATTRS.map(a => '[' + a + ']').join(',');
  const SKIP_TAG = /^(SCRIPT|STYLE|TEXTAREA|NOSCRIPT|CODE|PRE)$/;
  // Không dịch nội dung người dùng gõ trong bong bóng chat (trừ dòng "đã thu hồi")
  const skip = n => { const p = n.parentElement; return !p || SKIP_TAG.test(p.tagName) || !!p.closest('[data-no-i18n]') || (!!p.closest('.ms-b') && !p.closest('.rc')); };
  const CTX = [   // (nút chữ, chữ đã chuẩn hoá) -> bản dịch riêng theo vị trí, hoặc undefined
    (n, k) => (k === 'Dự án' && n.nextSibling && n.nextSibling.nodeType === 1) ? 'The project' : undefined   // "Dự án <b>Pipe Traffic</b> ..."
  ];
  const orig = new WeakMap(), aorig = new WeakMap();   // nhớ bản tiếng Việt gốc để trả lại khi đổi ngôn ngữ


  /* ---------- Dịch TỰ ĐỘNG nội dung admin / người dùng tự viết (không cần thêm vào từ điển) ----------
     Áp dụng cho chữ nằm trong phần tử có thuộc tính data-autotr: cập nhật tuần của dự án, Journey (kể cả tuần 5 trở đi), Team, FAQ, video, bình luận.
     Chỉ dịch đoạn có dấu tiếng Việt và chưa có trong từ điển. Kết quả nhớ trong localStorage (khoá pt_trc) nên lần sau không cần gọi lại.
     Lưu ý: đoạn chữ cần dịch được gửi tới dịch vụ dịch của Google (hoặc MyMemory nếu Google lỗi). */
  const VI_CH = /[ăâđêôơưàáạảãầấậẩẫằắặẳẵèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ]/i;
  const tcache = (() => { try { return JSON.parse(localStorage.getItem('pt_trc') || '{}') || {}; } catch (x) { return {}; } })();
  let tsave = 0, badUntil = 0, active = 0; const pend = new Map(), queue = [];
  function remember(k, v) {
    tcache[k] = v;
    const ks = Object.keys(tcache); if (ks.length > 600) ks.slice(0, 200).forEach(x => delete tcache[x]);   // giữ gọn
    clearTimeout(tsave); tsave = setTimeout(() => { try { localStorage.setItem('pt_trc', JSON.stringify(tcache)); } catch (x) { /* đầy bộ nhớ thì bỏ qua */ } }, 800);
  }
  async function remote(text) {
    if (Date.now() < badUntil) return '';
    try {
      const r = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=vi&tl=en&dt=t&q=' + encodeURIComponent(text.slice(0, 1500)));
      if (r.ok) { const j = await r.json(), out = (j[0] || []).map(x => x && x[0]).join(''); if (out) return out; }
    } catch (x) { /* thử dịch vụ dự phòng */ }
    try {
      const r = await fetch('https://api.mymemory.translated.net/get?langpair=vi%7Cen&q=' + encodeURIComponent(text.slice(0, 450)));
      if (r.ok) { const j = await r.json(), out = j && j.responseData && j.responseData.translatedText; if (out && !/MYMEMORY WARNING|INVALID|QUERY LENGTH/i.test(out)) return out; }
    } catch (x) { /* mất mạng */ }
    badUntil = Date.now() + 30000;   // lỗi cả hai: nghỉ 30 giây rồi mới thử lại
    return '';
  }
  function pump() { while (active < 3 && queue.length) { active++; queue.shift()().finally(() => { active--; pump(); }); } }
  function autoTr(n) {
    const p = n.parentElement; if (!p || !p.closest('[data-autotr]')) return;
    const vi = n.data, k = norm(vi); if (k.length < 2 || !VI_CH.test(k)) return;
    const apply = en => {
      if (lang !== 'en' || n.data !== vi || !n.isConnected) return;   // đã đổi ngôn ngữ / nội dung / bị xoá trong lúc chờ
      const t = /^\s*/.exec(vi)[0] + en + /\s*$/.exec(vi)[0]; orig.set(n, { vi, en: t }); n.data = t;
    };
    if (tcache[k]) { apply(tcache[k]); return; }
    queue.push(async () => {
      let pr = pend.get(k); if (!pr) { pr = remote(k); pend.set(k, pr); }
      const en = await pr; pend.delete(k);
      if (en && norm(en) !== k) { remember(k, en); apply(en); }
    });
    pump();
  }

  function doText(n) {
    if (skip(n)) return;
    const po = n.parentElement;
    if (po && po.tagName === 'OPTION' && !po.hasAttribute('value') && !orig.has(n)) po.setAttribute('value', n.data.trim());   // giữ nguyên giá trị gửi đi (tiếng Việt)
    const cur = n.data, rec = orig.get(n);
    if (lang === 'en') {
      if (rec && cur === rec.en) return;                 // đây chính là bản dịch của mình, bỏ qua
      let en = tr(cur);
      for (const f of CTX) { const r = f(n, norm(cur)); if (r !== undefined) { en = cur.replace(norm(cur), r); break; } }   // dịch theo ngữ cảnh
      if (en !== cur) { orig.set(n, { vi: cur, en }); n.data = en; } else if (rec) orig.delete(n); else autoTr(n);   // chưa có trong từ điển -> dịch tự động (nếu nằm trong vùng data-autotr)
    } else if (rec) { if (cur === rec.en) n.data = rec.vi; orig.delete(n); }
  }
  function doAttr(el, a) {
    if (!el.hasAttribute(a)) return;
    const cur = el.getAttribute(a); let m = aorig.get(el); const rec = m && m[a];
    if (lang === 'en') {
      if (rec && cur === rec.en) return;
      const en = tr(cur);
      if (en !== cur) { m = m || {}; m[a] = { vi: cur, en }; aorig.set(el, m); el.setAttribute(a, en); } else if (rec) delete m[a];
    } else if (rec) { if (cur === rec.en) el.setAttribute(a, rec.vi); delete m[a]; }
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) return doText(root);
    if (root.nodeType !== 1) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), list = []; let n;
    while ((n = w.nextNode())) list.push(n);
    list.forEach(doText);
    const els = root.matches && root.matches(SEL) ? [root] : [];
    root.querySelectorAll(SEL).forEach(e => els.push(e));
    els.forEach(e => ATTRS.forEach(a => doAttr(e, a)));
  }
  // Dịch một cây DOM rời (dùng cho chỉ mục tìm kiếm), không ghi nhớ bản gốc
  function translateTree(root) {
    if (lang !== 'en' || !root) return root;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { if (skip(n)) continue; const en = tr(n.data); if (en !== n.data) n.data = en; }
    return root;
  }

  /* ---------- Tiêu đề tab trình duyệt ---------- */
  const HOME_TITLE = 'Pipe Traffic - ĐH Khoa học Tự nhiên (HCMUS)';
  let titleVi = '';
  function retitle() {
    const T = lang === 'en' ? tr : (x => x);
    document.title = titleVi ? T(titleVi) + ' · Pipe Traffic' : T(HOME_TITLE);
  }
  function setTitle(vi) { titleVi = vi || ''; retitle(); }

  /* ---------- Nút đổi ngôn ngữ trên menu ---------- */
  function paintBtn() {
    const b = document.getElementById('langBtn'); if (!b) return;
    const lb = b.querySelector('b'); if (lb) lb.textContent = lang.toUpperCase();
    const t = lang === 'en' ? 'Language: English (click for Tiếng Việt)' : 'Ngôn ngữ: Tiếng Việt (bấm để chuyển sang English)';
    b.title = t; b.setAttribute('aria-label', t);
  }
  function set(l) {
    lang = l === 'en' ? 'en' : 'vi';
    try { localStorage.setItem(LS, lang); } catch (x) { /* bỏ qua */ }
    document.documentElement.lang = lang;
    walk(document.body); paintBtn(); retitle();
    window.dispatchEvent(new CustomEvent('pt-lang', { detail: lang }));
  }
  function mkBtn() {
    const host = document.querySelector('.sr-right');
    if (!host || document.getElementById('langBtn')) return;
    const b = document.createElement('button');
    b.type = 'button'; b.id = 'langBtn'; b.className = 'nav-ico lang'; b.innerHTML = '<i class="fa-solid fa-globe"></i><b></b>';
    b.onclick = () => set(lang === 'en' ? 'vi' : 'en');
    host.insertBefore(b, host.firstChild); paintBtn();
  }

  /* ---------- Khởi động ---------- */
  new MutationObserver(ms => {                          // chữ mới xuất hiện sau này cũng được dịch
    if (lang !== 'en') return;
    for (const m of ms) {
      if (m.type === 'childList') m.addedNodes.forEach(walk);
      else if (m.type === 'characterData') doText(m.target);
      else if (m.type === 'attributes') doAttr(m.target, m.attributeName);
    }
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });

  window.I18N = { tr, lang: () => lang, set, t: (vi, en) => (lang === 'en' ? en : vi), setTitle, translateTree };

  /* ---------- Giao diện tối / sáng ---------- */
  const TLS = 'pt_theme';
  let theme = 'light';
  try { const s = localStorage.getItem(TLS); theme = s || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); } catch (x) { /* mặc định sáng */ }
  function paintTheme() {
    document.documentElement.setAttribute('data-theme', theme);
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', theme === 'dark' ? '#0f172a' : '#0284c7');
    const b = document.getElementById('themeBtn'); if (!b) return;
    const ic = b.querySelector('i'); if (ic) ic.className = 'fa-solid ' + (theme === 'dark' ? 'fa-sun' : 'fa-moon'); else b.textContent = theme === 'dark' ? '☀️' : '🌙';
    const t = I18N.t(theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    b.title = t; b.setAttribute('aria-label', t);
  }
  function setTheme(t) {
    theme = t === 'dark' ? 'dark' : 'light';
    try { localStorage.setItem(TLS, theme); } catch (x) { /* bỏ qua */ }
    paintTheme();
  }
  function mkThemeBtn() {
    const host = document.querySelector('.sr-right');
    if (!host || document.getElementById('themeBtn')) return;
    const b = document.createElement('button');
    b.type = 'button'; b.id = 'themeBtn'; b.className = 'nav-ico theme'; b.innerHTML = '<i class="fa-solid fa-moon"></i>';
    b.onclick = () => setTheme(theme === 'dark' ? 'light' : 'dark');
    const lb = document.getElementById('langBtn');
    host.insertBefore(b, lb ? lb.nextSibling : host.firstChild); paintTheme();
  }
  window.addEventListener('pt-lang', paintTheme);
  paintTheme();   // đặt giao diện ngay khi tải để không bị nháy trắng

  /* ---------- Menu ☰ tự mở khi rê chuột (máy tính); điện thoại vẫn chạm để mở ---------- */
  function hoverMenu() {
    const btn = document.getElementById('mobile-menu-btn'), menu = document.getElementById('mobile-menu');
    if (!btn || !menu || btn.dataset.hover || !window.matchMedia || !matchMedia('(hover:hover) and (pointer:fine)').matches) return;
    btn.dataset.hover = '1';
    let timer = 0, openedAt = 0;
    const isOpen = () => menu.classList.contains('open');
    const open = () => { clearTimeout(timer); if (!isOpen() && typeof toggleMobileMenu === 'function') { toggleMobileMenu(); openedAt = Date.now(); } };
    const closeSoon = () => { clearTimeout(timer); timer = setTimeout(() => { if (isOpen() && typeof toggleMobileMenu === 'function') toggleMobileMenu(true); }, 280); };
    btn.removeAttribute('onclick');                       // tránh bấm ngay sau khi rê làm menu đóng lại
    btn.addEventListener('click', () => { if (Date.now() - openedAt < 700) return; isOpen() ? toggleMobileMenu(true) : open(); });
    [btn, menu].forEach(el => { el.addEventListener('mouseenter', open); el.addEventListener('mouseleave', closeSoon); });
    btn.addEventListener('focus', open);
  }

  mkThemeBtn(); hoverMenu();
  window.addEventListener('DOMContentLoaded', () => { mkBtn(); mkThemeBtn(); hoverMenu(); });
  window.addEventListener('load', () => { mkBtn(); mkThemeBtn(); hoverMenu(); });
  // bind(): gắn sự kiện cho nút #langBtn / #themeBtn có sẵn trong HTML (trang admin vẽ lại thanh nav nhiều lần)
  function bind() {
    const lb = document.getElementById('langBtn'), tb = document.getElementById('themeBtn');
    if (lb) { lb.onclick = () => set(lang === 'en' ? 'vi' : 'en'); paintBtn(); }
    if (tb) { tb.onclick = () => setTheme(theme === 'dark' ? 'light' : 'dark'); paintTheme(); }
  }
  // add(dict, rules, ctx): thêm bản dịch cho trang khác (vd. admin)
  function add(dict, rules, ctx) {
    if (dict) Object.assign(DICT, dict);
    if (rules) rules.forEach(r => RULES.push(r));
    if (ctx) ctx.forEach(f => CTX.push(f));
    if (lang === 'en') { walk(document.body); retitle(); }
  }
  Object.assign(window.I18N, { theme: () => theme, setTheme, bind, add });

  mkBtn();
  if (lang === 'en') { document.documentElement.lang = 'en'; walk(document.body); retitle(); }
})();
