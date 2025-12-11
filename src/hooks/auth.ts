import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createAccount, loginAccount, submitAttendance, getTodayAttendance, getAttendanceHistory, submitPermission, getUserPermissions, getTodayPermission } from "@/services/auth";
import { toast } from "sonner";
import type { RegisterData } from "@/types/auth";

// Query keys for React Query
export const authKeys = {
  currentUser: ["auth", "currentUser"] as const,
  all: ["auth"] as const,
};

export const attendanceKeys = {
  today: ["attendance", "today"] as const,
  history: ["attendance", "history"] as const,
  all: ["attendance"] as const,
};

// BARU — Query keys untuk Permission
export const permissionKeys = {
  today: ["permission", "today"] as const,
  history: (userId?: string) => ["permission", "history", userId] as const,
  all: ["permission"] as const,
};

// Hook untuk login user biasa
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: loginAccount,
    onSuccess: (data) => {
      if (data.user) {
        queryClient.setQueryData(authKeys.currentUser, { user: data.user });
      }
      return data;
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAccount,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: authKeys.all });
      return data;
    },
  });
}

// Hook untuk submit attendance
export function useSubmitAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitAttendance,
    onSuccess: (data, variables) => {
      console.log("Attendance submitted successfully:", data);

      queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.today });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.history });

      return data;
    },
    onError: (error: unknown) => {
      console.error("Attendance submission failed:", error);
    },
  });
}

// Hook untuk mengambil attendance hari ini
export function useTodayAttendance(userId?: string) {
  return useQuery({
    queryKey: [...attendanceKeys.today, userId],
    queryFn: () => getTodayAttendance(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });
}

// Hook untuk mengambil riwayat attendance
export function useAttendanceHistory(userId?: string, page: number = 1, limit: number = 10) {
  return useQuery({
    queryKey: [...attendanceKeys.history, userId, page, limit],
    queryFn: () => getAttendanceHistory(userId!, page, limit),
    enabled: !!userId,
    staleTime: 1000 * 60 * 10,
    retry: 2,
  });
}

// BARU — Hook untuk submit permission (izin / sakit / libur)
export function useSubmitPermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitPermission,
    onSuccess: () => {
      toast.success("Permission berhasil diajukan!");
      queryClient.invalidateQueries({ queryKey: permissionKeys.all });
      queryClient.invalidateQueries({ queryKey: permissionKeys.today }); // Invalidate today permission
    },
    onError: (error: any) => {
      toast.error(error.message || "Gagal mengajukan permission");
    },
  });
}

// BARU — Hook untuk ambil riwayat permission (buat nanti di halaman user)
export function useUserPermissions(userId?: string) {
  return useQuery({
    queryKey: permissionKeys.history(userId),
    queryFn: () => getUserPermissions(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}

// BARU — Hook untuk cek permission hari ini
export function useTodayPermission(userId?: string) {
  return useQuery({
    queryKey: [...permissionKeys.today, userId],
    queryFn: () => getTodayPermission(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });
}

