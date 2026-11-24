// ===== M1 sở hữu: cấu hình điều hướng app mobile (thêm / bớt mục tại đây) =====

export interface StudentTab {
  label: string;
  path: string;
  icon: string;
  end?: boolean;
}

export interface StudentShortcut {
  label: string;
  description: string;
  path: string;
  icon: string;
}

// Thanh tab dưới cùng.
export const STUDENT_TABS: StudentTab[] = [
  { label: "Trang chủ", path: "/app", icon: "⌂", end: true },
  { label: "Hub", path: "/app/hubs", icon: "◈" },
  { label: "Hoạt động", path: "/app/activity", icon: "☰" },
  { label: "Tài khoản", path: "/app/account", icon: "◯" },
];

// Lưới "Truy cập nhanh" trên trang chủ.
export const QUICK_ACTIONS: StudentShortcut[] = [
  {
    label: "Tìm xe dùng chung",
    description: "Tìm xe gần bạn, lọc loại xe và mức pin.",
    path: "/app/shared",
    icon: "⌕",
  },
  {
    label: "Đặt chỗ đỗ",
    description: "Đặt trước chỗ đỗ cho xe cá nhân.",
    path: "/app/parking",
    icon: "P",
  },
  {
    label: "Đăng ký sạc",
    description: "Chọn cổng sạc, khung giờ và pin mục tiêu.",
    path: "/app/charging/new",
    icon: "ϟ",
  },
  {
    label: "Lịch sạc của tôi",
    description: "Theo dõi yêu cầu, trạng thái và thời gian sạc.",
    path: "/app/charging",
    icon: "◷",
  },
];

// Danh sách liên kết dưới bản đồ.
export const STUDENT_LINKS: StudentShortcut[] = [
  {
    label: "Chuyến đi của tôi",
    description: "Nhận xe, mở khóa, trả xe và xem lịch sử.",
    path: "/app/trips",
    icon: "⇄",
  },
  {
    label: "Xe cá nhân & trạng thái pin",
    description: "Xem thông tin xe đã đăng ký và dữ liệu IoT.",
    path: "/app/personal",
    icon: "▮▮",
  },
  {
    label: "Hỗ trợ & báo cáo sự cố",
    description: "Gửi thông tin về xe, Hub hoặc cổng sạc.",
    path: "/app/support",
    icon: "?",
  },
];
