"use client";

import React, { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useSubmitAttendance, useTodayAttendance, useTodayPermission } from "@/hooks/auth";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { CheckCircle } from "lucide-react";

const Maps = dynamic(() => import("./Maps"), {
  ssr: false,
  loading: () => (
    <div className="h-[250px] bg-gray-200 rounded-lg flex items-center justify-center">
      <div className="text-gray-500">Memuat peta...</div>
    </div>
  ),
});

interface HolidayInfo {
  isHoliday: boolean;
  isWeekend: boolean;
  holidayName: string | null;
  isLoading: boolean;
}

const useHolidayCheck = (): HolidayInfo => {
  const [holidayInfo, setHolidayInfo] = useState<HolidayInfo>({
    isHoliday: false,
    isWeekend: false,
    holidayName: null,
    isLoading: true,
  });

  useEffect(() => {
    const checkHoliday = async () => {
      const today = new Date();
      const dayOfWeek = today.getDay();

      if (dayOfWeek === 0 || dayOfWeek === 6) {
        setHolidayInfo({
          isHoliday: false,
          isWeekend: true,
          holidayName: dayOfWeek === 0 ? "Minggu" : "Sabtu",
          isLoading: false,
        });
        return;
      }

      try {
        const year = today.getFullYear();
        const response = await fetch(`/api/holidays?year=${year}`);
        if (response.ok) {
          const result = await response.json();
          if (result.status === "success") {
            const holidays = result.data;
            const todayStr = today.toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
            const holiday = holidays.find((h: any) => h.date === todayStr);

            if (holiday) {
              setHolidayInfo({
                isHoliday: true,
                isWeekend: false,
                holidayName: holiday.name || "Hari Libur Nasional",
                isLoading: false,
              });
              return;
            }
          }
        }
      } catch (error) {
        console.error("Error fetching holidays:", error);
      }

      setHolidayInfo({
        isHoliday: false,
        isWeekend: false,
        holidayName: null,
        isLoading: false,
      });
    };

    checkHoliday();
  }, []);

  return holidayInfo;
};

const OFFICE_LOCATION = {
  latitude: parseFloat(process.env.NEXT_PUBLIC_OFFICE_LAT || "-2.1360196129894264"),
  longitude: parseFloat(process.env.NEXT_PUBLIC_OFFICE_LNG || "106.0848296111155"),
};
const MAX_DISTANCE_METERS = parseInt(process.env.NEXT_PUBLIC_MAX_RADIUS || "100", 10);

const getDistanceFromOffice = (userLat: number, userLng: number): number => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(OFFICE_LOCATION.latitude - userLat);
  const dLon = toRad(OFFICE_LOCATION.longitude - userLng);
  const lat1 = toRad(userLat);
  const lat2 = toRad(OFFICE_LOCATION.latitude);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

const useGeolocation = () => {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation tidak didukung browser ini");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setLoading(false);
      },
      (err) => {
        let msg = "Gagal mendapatkan lokasi";
        if (err.code === err.PERMISSION_DENIED) msg = "Izin lokasi ditolak. Harap izinkan akses lokasi.";
        else if (err.code === err.POSITION_UNAVAILABLE) msg = "Lokasi tidak tersedia";
        else if (err.code === err.TIMEOUT) msg = "Timeout mendapatkan lokasi";
        setError(msg);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  return { location, error, loading };
};

const ClockSkeleton = () => (
  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
    <div className="flex justify-between items-start mb-4">
      <Skeleton className="h-8 w-28 bg-slate-100" />
      <Skeleton className="h-5 w-5 bg-slate-100 rounded-md" />
    </div>
    <div className="flex flex-col items-center mb-6">
      <Skeleton className="h-14 w-40 bg-slate-100" />
      <Skeleton className="h-4 w-28 mt-3 bg-slate-100 rounded-full" />
    </div>
    <div className="grid grid-cols-2 gap-3">
      <Skeleton className="h-24 bg-slate-50 rounded-xl" />
      <Skeleton className="h-24 bg-slate-50 rounded-xl" />
    </div>
  </div>
);

export default function Clock() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isTimeLoaded, setIsTimeLoaded] = useState(false);
  const [openClockIn, setOpenClockIn] = useState(false);
  const [openClockOut, setOpenClockOut] = useState(false);
  const [checkoutNote, setCheckoutNote] = useState("");
  const [successOverlay, setSuccessOverlay] = useState<{ show: boolean; type: "masuk" | "pulang"; time?: string }>({ show: false, type: "masuk" });


  const { data: session, status } = useSession();
  const router = useRouter();

  const clockInLocation = useGeolocation();
  const clockOutLocation = useGeolocation();
  const attendanceMutation = useSubmitAttendance();

  const userId = useMemo(() => {
    if (session?.user?.id) return session.user.id;
    if (typeof window !== "undefined") {
      try {
        const data = localStorage.getItem("user-data");
        if (data) return JSON.parse(data).id;
      } catch { }
    }
    return null;
  }, [session]);

  const { data: todayAttendance } = useTodayAttendance(userId || undefined);
  const { data: todayPermission } = useTodayPermission(userId || undefined);
  const hasPermissionToday = !!todayPermission?.hasPermission;
  const permissionType = todayPermission?.permission?.type;
  const holidayInfo = useHolidayCheck();
  const isOffDay = holidayInfo.isHoliday || holidayInfo.isWeekend;

  useEffect(() => {
    if (status === "loading") return;
    if (session?.user) return;
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("auth-token");
      const user = localStorage.getItem("user-data");
      if (token && user) return;
    }
    router.push("/login?callbackUrl=/");
  }, [session, status, router]);

  useEffect(() => {
    const timer = setTimeout(() => setIsTimeLoaded(true), 1200);
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const formatTime = (date: Date) => date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const formatDate = (date: Date) => date.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const getTimezoneName = () => {
    const offset = new Date().getTimezoneOffset() / -60;
    if (offset === 7) return "Waktu Indonesia Barat";
    if (offset === 8) return "Waktu Indonesia Tengah";
    if (offset === 9) return "Waktu Indonesia Timur";
    return "Waktu Standar Lokal";
  };

  const formatCoordinates = (lat: number, lng: number) => {
    const latDir = lat >= 0 ? "N" : "S";
    const lngDir = lng >= 0 ? "E" : "W";
    return `${Math.abs(lat).toFixed(6)}°${latDir}, ${Math.abs(lng).toFixed(6)}°${lngDir}`;
  };

  const checkInRadius = (loc: { latitude: number; longitude: number }) => {
    const distance = getDistanceFromOffice(loc.latitude, loc.longitude);
    return { isAllowed: distance <= MAX_DISTANCE_METERS, distance };
  };

  const handleCheckIn = () => {
    if (isOffDay) {
      toast.info("Hari Libur", { description: `Tidak perlu absen hari ${holidayInfo.holidayName}` });
      return;
    }
    if (hasPermissionToday) {
      toast.error("Tidak bisa absen", { description: `Anda sudah ${permissionType} hari ini.` });
      return;
    }
    if (!clockInLocation.location) {
      toast.error("Lokasi belum tersedia");
      return;
    }
    const { isAllowed, distance } = checkInRadius(clockInLocation.location);
    if (!isAllowed) {
      toast.error("Di luar radius kantor!", { description: `Jarak: ${distance}m. Maks: ${MAX_DISTANCE_METERS}m.` });
      return;
    }
    if (!userId) { router.push("/login"); return; }

    attendanceMutation.mutate(
      {
        type: "checkin",
        latitude: clockInLocation.location.latitude,
        longitude: clockInLocation.location.longitude,
        timestamp: new Date().toISOString(),
        userId,
      },
      {
        onSuccess: () => {
          // toast.success("Absen Masuk Berhasil!", { description: `${formatTime(new Date())} • ${distance}m dari kantor` });
          setOpenClockIn(false);
          setSuccessOverlay({ show: true, type: "masuk", time: formatTime(new Date()) });
          setTimeout(() => setSuccessOverlay((prev) => ({ ...prev, show: false })), 3000);
        },
        onError: (err: any) => toast.error("Absen gagal", { description: err.message }),
      }
    );
  };

  const handleCheckOut = () => {
    if (isOffDay) {
      toast.info("Hari Libur", { description: `Tidak perlu absen hari ${holidayInfo.holidayName}` });
      return;
    }
    if (!clockOutLocation.location) {
      toast.error("Lokasi belum tersedia");
      return;
    }
    if (!userId) { router.push("/login"); return; }

    attendanceMutation.mutate(
      {
        type: "checkout",
        latitude: clockOutLocation.location.latitude,
        longitude: clockOutLocation.location.longitude,
        timestamp: new Date().toISOString(),
        userId,
        notes: checkoutNote,
      },
      {
        onSuccess: () => {
          // const checkInStr = todayAttendance?.attendance?.checkInTime
          //   ? formatTime(new Date(todayAttendance.attendance.checkInTime)).split(':').slice(0, 2).join(':')
          //   : "--:--";
          // const checkOutStr = formatTime(new Date()).split(':').slice(0, 2).join(':');
          // toast.success("Absen Pulang Berhasil!", { description: `Jam masuk: ${checkInStr} • Jam keluar: ${checkOutStr}` });
          setOpenClockOut(false);
          setCheckoutNote("");
          setSuccessOverlay({ show: true, type: "pulang", time: formatTime(new Date()) });
          setTimeout(() => setSuccessOverlay((prev) => ({ ...prev, show: false })), 3000);
        },
        onError: (err: any) => toast.error("Absen gagal", { description: err.message }),
      }
    );
  };


  if (!isTimeLoaded) return <ClockSkeleton />;

  return (
    <>
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 overflow-hidden relative">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-[9px] font-black text-yellow-500 uppercase tracking-widest mb-0.5">Hari Ini</p>
            <h2 className="text-xs font-bold text-slate-800">{formatDate(currentTime)}</h2>
          </div>
          <div className="h-5 w-5 rounded-md bg-yellow-50 flex items-center justify-center">
            <div className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
          </div>
        </div>

        <div className="flex flex-col items-center mb-6 relative">
          <div className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter tabular-nums flex items-baseline gap-1">
            {formatTime(currentTime).split(":").map((part, i, arr) => (
              <React.Fragment key={i}>
                <span className={i === 2 ? "text-yellow-500 text-2xl" : ""}>{part}</span>
                {i < arr.length - 1 && <span className="text-slate-200 text-2xl font-light -translate-y-0.5">:</span>}
              </React.Fragment>
            ))}
          </div>

          {isOffDay ? (
            <div className="mt-3 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">{holidayInfo.holidayName}</span>
            </div>
          ) : hasPermissionToday ? (
            <div className="mt-3 px-3 py-1 rounded-full bg-amber-50 border border-amber-100 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">
                Status: {permissionType}
              </span>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{getTimezoneName()}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mt-2">
          {/* Check In Button */}
          <button
            onClick={() => setOpenClockIn(true)}
            disabled={isOffDay || hasPermissionToday}
            className={`group relative h-32 w-full rounded-[2rem] flex flex-col items-center justify-center gap-1 transition-all duration-500 active:scale-95 overflow-hidden ${todayAttendance?.attendance?.checkInTime
              ? "bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 border-none shadow-[0_12px_30px_-10px_rgba(16,185,129,0.6)] text-white"
              : isOffDay || hasPermissionToday
                ? "bg-slate-50 border border-slate-100 opacity-50 grayscale cursor-not-allowed"
                : "bg-white border border-slate-200/60 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-10px_rgba(16,185,129,0.2)] hover:border-emerald-300"
              }`}
          >
            {/* Background Details */}
            {!todayAttendance?.attendance?.checkInTime && !(isOffDay || hasPermissionToday) && (
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-emerald-100/80 to-transparent blur-2xl rounded-full group-hover:scale-150 transition-transform duration-700" />
            )}
            {todayAttendance?.attendance?.checkInTime && (
              <>
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/20 blur-2xl rounded-full" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-900/20 blur-2xl rounded-full" />
              </>
            )}

            <div className="relative z-10 flex flex-col items-center">
              {todayAttendance?.attendance?.checkInTime ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center mb-1 shadow-[inset_0_2px_10px_rgba(255,255,255,0.3)]">
                    <CheckCircle className="w-6 h-6 text-white drop-shadow-md" />
                  </div>
                  <p className="text-[9px] font-black uppercase text-emerald-100 tracking-[0.2em] mb-0.5">Sudah Masuk</p>
                  <p className="text-xl font-black text-white tracking-tighter drop-shadow-md">
                    {formatTime(new Date(todayAttendance.attendance.checkInTime)).split(':').slice(0, 2).join(':')}
                  </p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-[1rem] bg-gradient-to-br from-emerald-50 to-emerald-100/60 border border-emerald-200/60 flex items-center justify-center mb-1 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-sm group-hover:shadow-emerald-200/50">
                    <svg className="w-5 h-5 text-emerald-600 drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-0.5 group-hover:text-emerald-500 transition-colors">Masuk</p>
                  <p className="text-xl font-black text-slate-800 tracking-tighter">
                    --:--
                  </p>
                </>
              )}
            </div>
          </button>

          {/* Check Out Button */}
          <button
            onClick={() => setOpenClockOut(true)}
            disabled={isOffDay || hasPermissionToday}
            className={`group relative h-32 w-full rounded-[2rem] flex flex-col items-center justify-center gap-1 transition-all duration-500 active:scale-95 overflow-hidden ${todayAttendance?.attendance?.checkOutTime
              ? "bg-gradient-to-br from-rose-400 via-rose-500 to-rose-600 border-none shadow-[0_12px_30px_-10px_rgba(244,63,94,0.6)] text-white"
              : isOffDay || hasPermissionToday
                ? "bg-slate-50 border border-slate-100 opacity-50 grayscale cursor-not-allowed"
                : "bg-white border border-slate-200/60 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-10px_rgba(244,63,94,0.2)] hover:border-rose-300"
              }`}
          >
            {/* Background Details */}
            {!todayAttendance?.attendance?.checkOutTime && !(isOffDay || hasPermissionToday) && (
              <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-gradient-to-tr from-rose-100/80 to-transparent blur-2xl rounded-full group-hover:scale-150 transition-transform duration-700" />
            )}
            {todayAttendance?.attendance?.checkOutTime && (
              <>
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/20 blur-2xl rounded-full" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-rose-900/20 blur-2xl rounded-full" />
              </>
            )}

            <div className="relative z-10 flex flex-col items-center">
              {todayAttendance?.attendance?.checkOutTime ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center mb-1 shadow-[inset_0_2px_10px_rgba(255,255,255,0.3)]">
                    <CheckCircle className="w-6 h-6 text-white drop-shadow-md" />
                  </div>
                  <p className="text-[9px] font-black uppercase text-rose-100 tracking-[0.2em] mb-0.5">Sudah Pulang</p>
                  <p className="text-xl font-black text-white tracking-tighter drop-shadow-md">
                    {formatTime(new Date(todayAttendance.attendance.checkOutTime)).split(':').slice(0, 2).join(':')}
                  </p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-[1rem] bg-gradient-to-br from-rose-50 to-rose-100/60 border border-rose-200/60 flex items-center justify-center mb-1 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500 shadow-sm group-hover:shadow-rose-200/50">
                    <svg className="w-5 h-5 text-rose-600 drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-0.5 group-hover:text-rose-500 transition-colors">Pulang</p>
                  <p className="text-xl font-black text-slate-800 tracking-tighter">
                    --:--
                  </p>
                </>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* DRAWER ABSEN MASUK */}
      <Drawer open={openClockIn} onOpenChange={setOpenClockIn}>
        <DrawerContent className="max-h-[85vh]">
          <div className="mx-auto w-full max-w-lg p-6 overflow-y-auto">
            <DrawerHeader className="px-0 pt-0">

              <div className="flex justify-between items-center mb-4">
                <DrawerTitle className="text-2xl font-black">Absen Masuk</DrawerTitle>
                <DrawerClose className="text-slate-400">×</DrawerClose>
              </div>
            </DrawerHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Waktu</p>
                  <p className="font-black text-slate-800">{formatTime(currentTime)}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Jam Masuk</p>
                  <p className="font-black text-slate-800">
                    {todayAttendance?.attendance?.checkInTime
                      ? formatTime(new Date(todayAttendance.attendance.checkInTime))
                      : "--:--:--"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-3">Verifikasi Lokasi</p>
                {clockInLocation.loading ? (
                  <p className="text-sm text-blue-600 animate-pulse">Mencari lokasi...</p>
                ) : clockInLocation.error ? (
                  <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-xs font-bold ring-1 ring-rose-100">{clockInLocation.error}</div>
                ) : clockInLocation.location && (
                  <div className="space-y-4">
                    <div className={`p-4 rounded-2xl border-2 ${checkInRadius(clockInLocation.location).isAllowed ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-rose-50 border-rose-100 text-rose-700"}`}>
                      <p className="font-black text-sm">{checkInRadius(clockInLocation.location).isAllowed ? "Lokasi Sesuai" : "Di Luar Jangkauan"}</p>
                      <p className="text-[10px] mt-1 opacity-70">Jarak: {checkInRadius(clockInLocation.location).distance}m dari kantor (Maks {MAX_DISTANCE_METERS}m)</p>
                    </div>
                    <div className="rounded-2xl overflow-hidden border-2 border-slate-50 shadow-sm aspect-video">
                      <Maps height="100%" currentLocation={clockInLocation.location} />
                    </div>
                    <button
                      onClick={handleCheckIn}
                      disabled={!checkInRadius(clockInLocation.location).isAllowed || attendanceMutation.isPending || !!todayAttendance?.attendance?.checkInTime}
                      className="w-full bg-slate-900 text-white h-14 rounded-2xl font-black transition-all active:scale-95 disabled:opacity-20 translate-y-2 mb-4"
                    >
                      {attendanceMutation.isPending ? "MEMPROSES..." : !!todayAttendance?.attendance?.checkInTime ? "SUDAH ABSEN MASUK" : "KONFIRMASI MASUK"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* DRAWER ABSEN PULANG */}
      <Drawer open={openClockOut} onOpenChange={setOpenClockOut}>
        <DrawerContent className="max-h-[85vh]">
          <div className="mx-auto w-full max-w-lg p-6 overflow-y-auto">
            <DrawerHeader className="px-0 pt-0">

              <div className="flex justify-between items-center mb-4">
                <DrawerTitle className="text-2xl font-black">Absen Pulang</DrawerTitle>
                <DrawerClose className="text-slate-400">×</DrawerClose>
              </div>
            </DrawerHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Waktu</p>
                  <p className="font-black text-slate-800">{formatTime(currentTime)}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Jam Pulang</p>
                  <p className="font-black text-slate-800">
                    {todayAttendance?.attendance?.checkOutTime
                      ? formatTime(new Date(todayAttendance.attendance.checkOutTime))
                      : "--:--:--"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-3">Status Lokasi</p>
                {clockOutLocation.loading ? (
                  <p className="text-sm text-blue-600 animate-pulse">Mencari lokasi...</p>
                ) : clockOutLocation.error ? (
                  <p className="text-xs text-rose-500">{clockOutLocation.error}</p>
                ) : clockOutLocation.location && (
                  <div className="space-y-4">
                    <div className="bg-amber-50 p-4 rounded-2xl border-2 border-amber-100 text-amber-700">
                      <p className="font-black text-sm italic text-center">"Hati-hati di jalan, selamat beristirahat!"</p>
                    </div>
                    <div className="rounded-2xl overflow-hidden border-2 border-slate-50 shadow-sm aspect-video">
                      <Maps height="100%" currentLocation={clockOutLocation.location} />
                    </div>

                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Keterangan (Opsional)</p>
                      <textarea
                        placeholder="Contoh: Pulang awal karena urusan keluarga / Selesai pekerjaan..."
                        value={checkoutNote}
                        onChange={(e) => setCheckoutNote(e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-xs font-medium focus:ring-2 focus:ring-rose-500 min-h-[80px] transition-all"
                      />
                    </div>

                    <button

                      onClick={handleCheckOut}
                      disabled={attendanceMutation.isPending || !!todayAttendance?.attendance?.checkOutTime}
                      className="w-full bg-rose-600 text-white h-14 rounded-2xl font-black transition-all active:scale-95 disabled:opacity-50 translate-y-2 mb-4"
                    >
                      {attendanceMutation.isPending ? "MEMPROSES..." : !!todayAttendance?.attendance?.checkOutTime ? "SUDAH ABSEN PULANG" : "KONFIRMASI PULANG"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* SUCCESS OVERLAY */}
      {successOverlay.show && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/40 backdrop-blur-[24px] animate-in fade-in duration-500 px-6 text-center">
          <div className="animate-in slide-in-from-bottom-10 fade-in duration-700 ease-out flex flex-col items-center">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-8 bg-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl border-2 border-white ${successOverlay.type === "masuk" ? "text-emerald-500" : "text-rose-500"}`}>
              <CheckCircle className="w-10 h-10 drop-shadow-sm" strokeWidth={3} />
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tighter leading-tight mb-8 max-w-[280px] mx-auto">
              {successOverlay.type === "masuk"
                ? "Anda berhasil melakukan absensi masuk, semangat bekerja!"
                : "Anda berhasil melakukan absensi pulang, selamat beristirahat!"}
            </h2>

            <div className="px-6 py-3 rounded-full bg-white/50 backdrop-blur-md border border-white shadow-sm">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                WAKTU TERCATAT <span className="text-slate-800 ml-2">{successOverlay.time}</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
