import type { RegisterData, LoginData, AuthResponse } from "@/types/auth";
import { axiosClient } from "./axios";

// ========================================
// TYPES
// ========================================
export interface AttendanceRequest {
  type: "checkin" | "checkout";
  latitude: number;
  longitude: number;
  timestamp: string;
  userId?: string;
}

export interface AttendanceResponse {
  success: boolean;
  message: string;
  data?: unknown;
}

export interface PermissionRequest {
  type: "izin" | "sakit" | "libur";
  note?: string;
}

export interface PermissionResponse {
  success: boolean;
  message: string;
  data?: unknown;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  address: string | null;
  role: string;
  createdAt: string;
}

export interface UpdateProfileRequest {
  name?: string;
  phone?: string;
  address?: string;
}

export interface ProfileResponse {
  success: boolean;
  message?: string;
  data?: UserProfile;
  error?: string;
}

// ========================================
// AUTH FUNCTIONS
// ========================================

export async function loginAccount(data: LoginData): Promise<AuthResponse> {
  try {
    const response = await axiosClient.post("/auth/login", data);
    return response.data;
  } catch (err: any) {
    const msg = err.response?.data?.message || err.response?.data?.error || err.message || "Email atau password salah";
    throw new Error(msg);
  }
}

export async function createAccount(data: RegisterData): Promise<AuthResponse> {
  try {
    const response = await axiosClient.post("/auth/register", data);
    return response.data;
  } catch (err: any) {
    const msg = err.response?.data?.message || err.response?.data?.error || err.message || "Gagal membuat akun";
    throw new Error(msg);
  }
}

// ========================================
// ATTENDANCE FUNCTIONS
// ========================================

export async function submitAttendance(data: AttendanceRequest): Promise<AttendanceResponse> {
  try {
    console.log("🚀 Sending attendance:", data);

    if (typeof data.timestamp !== "string") {
      throw new Error("Timestamp harus string ISO");
    }

    const response = await axiosClient.post("/attendance", data, {
      withCredentials: true,
    });

    console.log("✅ Attendance success:", response.data);
    return response.data;
  } catch (err: any) {
    const msg = err.response?.data?.error || err.response?.data?.message || err.message || "Gagal absen";

    console.error("❌ Attendance error:", msg);
    throw new Error(msg);
  }
}

export async function getTodayAttendance(userId: string) {
  try {
    const response = await axiosClient.get(`/attendance/today?userId=${userId}`);
    return response.data;
  } catch (err: any) {
    const msg = err.response?.data?.message || "Gagal mengambil absen hari ini";
    throw new Error(msg);
  }
}

export async function getAttendanceHistory(userId: string, page = 1, limit = 10) {
  try {
    const response = await axiosClient.get(`/attendance/history?userId=${userId}&page=${page}&limit=${limit}`);
    return response.data;
  } catch (err: any) {
    const msg = err.response?.data?.message || "Gagal mengambil riwayat";
    throw new Error(msg);
  }
}

// ========================================
// PERMISSION FUNCTIONS
// ========================================

export async function submitPermission(data: PermissionRequest): Promise<PermissionResponse> {
  try {
    console.log("🚀 Sending permission:", data);

    const response = await axiosClient.post("/permission", data, {
      withCredentials: true,
    });

    console.log("✅ Permission success:", response.data);
    return response.data;
  } catch (err: any) {
    const msg = err.response?.data?.error || err.response?.data?.message || err.message || "Gagal mengajukan permission";
    console.error("❌ Permission error:", msg);
    console.error("❌ Full error:", err.response?.data || err);
    throw new Error(msg);
  }
}

export async function getUserPermissions(userId: string) {
  try {
    const response = await axiosClient.get(`/permission/history?userId=${userId}`, {
      withCredentials: true,
    });
    return response.data;
  } catch (err: any) {
    const msg = err.response?.data?.error || err.response?.data?.message || "Gagal mengambil riwayat permission";
    throw new Error(msg);
  }
}

export async function getTodayPermission(userId: string) {
  try {
    const response = await axiosClient.get(`/permission/today?userId=${userId}`, {
      withCredentials: true,
    });
    return response.data;
  } catch (err: any) {
    const msg = err.response?.data?.error || err.response?.data?.message || "Gagal mengecek permission hari ini";
    throw new Error(msg);
  }
}

// ========================================
//  PROFILE FUNCTIONS
// ========================================


export async function getUserProfile(): Promise<UserProfile> {
  try {
    console.log("🚀 Fetching user profile...");

    const response = await axiosClient.get("/profile", {
      withCredentials: true,
    });

    console.log("✅ Profile fetched:", response.data);
    return response.data.data;
  } catch (err: any) {
    const msg = err.response?.data?.error || err.message || "Gagal mengambil data profile";
    console.error("❌ Get profile error:", msg);
    console.error("❌ Full response:", err.response);
    throw new Error(msg);
  }
}

export async function updateUserProfile(data: UpdateProfileRequest): Promise<UserProfile> {
  try {
    console.log("🚀 Updating profile:", data);

    const response = await axiosClient.put("/profile", data, {
      withCredentials: true,
    });

    console.log("✅ Profile updated:", response.data);
    return response.data.data;
  } catch (err: any) {
    const msg = err.response?.data?.error || err.message || "Gagal update profile";
    console.error("❌ Update profile error:", msg);
    throw new Error(msg);
  }
}
