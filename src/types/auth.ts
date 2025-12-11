// ========================================
// AUTH TYPES
// ========================================

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: string;
  phone?: string;
  address?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  token?: string;
}

// ========================================
// ATTENDANCE TYPES
// ========================================

export interface AttendanceRequest {
  type: "checkin" | "checkout";
  latitude: number;
  longitude: number;
  timestamp: string; // ISO string format
  userId?: string;
}

export interface Attendance {
  id: string;
  userId: string;
  date: string;
  checkInTime: string | null;
  checkInLatitude: number | null;
  checkInLongitude: number | null;
  checkInAddress: string | null;
  checkOutTime: string | null;
  checkOutLatitude: number | null;
  checkOutLongitude: number | null;
  checkOutAddress: string | null;
  status: "present" | "late" | "absent";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceResponse {
  success: boolean;
  message: string;
  data: Attendance;
}

export interface AttendanceListResponse {
  success: boolean;
  data: Attendance[];
}
