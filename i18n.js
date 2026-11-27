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
  const STATIC = /*@@STATIC@@*/{};

  /* ---------- Từ điển 2: chữ do JavaScript tạo ra (trang dự án, đăng nhập, chat, tìm kiếm, video, liên hệ...) ---------- */
  const DYN = {
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
  const orig = new WeakMap(), aorig = new WeakMap();   // nhớ bản tiếng Việt gốc để trả lại khi đổi ngôn ngữ

  function doText(n) {
    if (skip(n)) return;
    const cur = n.data, rec = orig.get(n);
    if (lang === 'en') {
      if (rec && cur === rec.en) return;                 // đây chính là bản dịch của mình, bỏ qua
      const en = tr(cur);
      if (en !== cur) { orig.set(n, { vi: cur, en }); n.data = en; } else if (rec) orig.delete(n);
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
    b.querySelector('b').textContent = lang.toUpperCase();
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
  mkBtn();
  if (lang === 'en') { document.documentElement.lang = 'en'; walk(document.body); retitle(); }
})();
