"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useSubmitAttendance, useTodayAttendance, useTodayPermission } from "@/hooks/auth";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { AlertCircle } from "lucide-react";

const Maps = dynamic(() => import("./Maps"), {
  ssr: false,
  loading: () => (
    <div className="h-[250px] bg-gray-200 rounded-lg flex items-center justify-center">
      <div className="text-gray-500">Memuat peta...</div>
    </div>
  ),
});

{
  /* HOOK UNTUK CEK HARI LIBUR DAN WEEKEND */
}
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

      // Check weekend (0 = Sunday, 6 = Saturday)
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        setHolidayInfo({
          isHoliday: false,
          isWeekend: true,
          holidayName: dayOfWeek === 0 ? "Minggu" : "Sabtu",
          isLoading: false,
        });
        return;
      }

      // Check national holiday from API
      try {
        const year = today.getFullYear();
        const response = await fetch(`https://libur.deno.dev/api?year=${year}`);
        if (response.ok) {
          const holidays = await response.json();
          const todayStr = today.toISOString().split("T")[0];
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
      } catch (error) {
        console.error("Error fetching holidays:", error);
      }

      // Regular workday
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

{
  /* KONFIGURASI LOKASI KANTOR & RADIUS */
}
const OFFICE_LOCATION = {
  latitude: parseFloat(process.env.NEXT_PUBLIC_OFFICE_LAT || "-2.1360196129894264"),
  longitude: parseFloat(process.env.NEXT_PUBLIC_OFFICE_LNG || "106.0848296111155"),
};
const MAX_DISTANCE_METERS = parseInt(process.env.NEXT_PUBLIC_MAX_RADIUS || "100", 10);

{
  /* HITUNG JARAK */
}
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

{
  /* SKELETON */
}
const ClockSkeleton = () => (
  <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl p-6 shadow-xl">
    <Skeleton className="h-4 w-32 mb-2 bg-slate-600" />
    <div className="text-center mb-4">
      <Skeleton className="h-16 md:h-20 w-48 mx-auto mb-2 bg-slate-600" />
      <div className="flex justify-center items-center space-x-1 mb-2">
        <Skeleton className="h-6 w-8 bg-slate-600" />
        <span className="text-slate-400">:</span>
        <Skeleton className="h-6 w-8 bg-slate-600" />
        <span className="text-slate-400">:</span>
        <Skeleton className="h-6 w-8 bg-slate-600" />
      </div>
      <Skeleton className="h-4 w-40 mx-auto bg-slate-600 opacity-80" />
    </div>
    <div className="grid grid-cols-2 gap-4">
      {[1, 2].map((i) => (
        <div key={i} className="bg-slate-600 rounded-xl py-6 px-4 flex flex-col items-center">
          <Skeleton className="w-16 h-16 rounded-full mb-2 bg-slate-500" />
          <Skeleton className="h-4 w-20 bg-slate-500" />
        </div>
      ))}
    </div>
  </div>
);

export default function Clock() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isTimeLoaded, setIsTimeLoaded] = useState(false);
  const [openClockIn, setOpenClockIn] = useState(false);
  const [openClockOut, setOpenClockOut] = useState(false);

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
      } catch {}
    }
    return null;
  }, [session]);

  const { data: todayAttendance, isLoading: isLoadingAttendance } = useTodayAttendance(userId || undefined);

  const { data: todayPermission } = useTodayPermission(userId || undefined);
  const hasPermissionToday = !!todayPermission?.hasPermission;
  const permissionType = todayPermission?.permission?.type;

  // Check if today is holiday or weekend
  const holidayInfo = useHolidayCheck();
  const isOffDay = holidayInfo.isHoliday || holidayInfo.isWeekend;

  {
    /* REDIRECT LOGIN */
  }
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

  const formatCoordinates = (lat: number, lng: number) => {
    const latDir = lat >= 0 ? "N" : "S";
    const lngDir = lng >= 0 ? "E" : "W";
    return `${Math.abs(lat).toFixed(6)}°${latDir}, ${Math.abs(lng).toFixed(6)}°${lngDir}`;
  };

  const checkInRadius = (loc: { latitude: number; longitude: number }) => {
    const distance = getDistanceFromOffice(loc.latitude, loc.longitude);
    return { isAllowed: distance <= MAX_DISTANCE_METERS, distance };
  };

  {
    /* CLOCK IN */
  }
  const handleCheckIn = () => {
    if (isOffDay) {
      toast.info("Hari Libur", {
        description: `Tidak perlu absen hari ${holidayInfo.holidayName}`,
        duration: 4000,
      });
      return;
    }

    if (hasPermissionToday) {
      const typeLabel = permissionType === "izin" ? "Izin" : permissionType === "sakit" ? "Sakit" : "Libur";
      toast.error("Tidak bisa absen", {
        description: `Anda sudah mengajukan ${typeLabel} hari ini.`,
        duration: 4000,
      });
      return;
    }

    if (!clockInLocation.location) {
      toast.error("Lokasi belum tersedia");
      return;
    }

    const { isAllowed, distance } = checkInRadius(clockInLocation.location);

    if (!isAllowed) {
      toast.error("Di luar radius kantor!", {
        description: `Jarak Anda ${distance}m. Maksimal ${MAX_DISTANCE_METERS}m.`,
        duration: 7000,
      });
      return;
    }

    if (!userId) {
      toast.error("Silakan login terlebih dahulu");
      router.push("/login");
      return;
    }

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
          toast.success("Absen Masuk Berhasil!", {
            description: `${formatTime(new Date())} • ${distance}m dari kantor`,
          });
          setOpenClockIn(false);
        },
        onError: (err: any) => {
          toast.error("Absen gagal", { description: err.message });
        },
      }
    );
  };

  {
    /* CLOCK OUT */
  }
  const handleCheckOut = () => {
    if (isOffDay) {
      toast.info("Hari Libur", {
        description: `Tidak perlu absen hari ${holidayInfo.holidayName}`,
        duration: 4000,
      });
      return;
    }

    if (!clockOutLocation.location) {
      toast.error("Lokasi belum tersedia");
      return;
    }

    if (!userId) {
      toast.error("Silakan login terlebih dahulu");
      router.push("/login");
      return;
    }

    attendanceMutation.mutate(
      {
        type: "checkout",
        latitude: clockOutLocation.location.latitude,
        longitude: clockOutLocation.location.longitude,
        timestamp: new Date().toISOString(),
        userId,
      },
      {
        onSuccess: (data: any) => {
          toast.success("Absen Pulang Berhasil!", {
            description: formatTime(new Date()),
          });
          setOpenClockOut(false);
        },
        onError: (err: any) => {
          toast.error("Absen gagal", { description: err.message });
        },
      }
    );
  };

  if (!isTimeLoaded) return <ClockSkeleton />;

  return (
    <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl p-6 shadow-xl text-white">
      <p className="text-sm opacity-90 mb-2">{formatDate(currentTime)}</p>
      <div className="text-center mb-6">
        <div className="text-4xl md:text-7xl sm:text-6xl  font-bold tracking-wider">{formatTime(currentTime)}</div>
        {isOffDay ? (
          <p className={`text-sm mt-3 ${holidayInfo.isHoliday ? "text-purple-300" : "text-blue-300"}`}>{holidayInfo.isHoliday ? holidayInfo.holidayName : `Hari ${holidayInfo.holidayName} - Selamat beristirahat!`}</p>
        ) : hasPermissionToday ? (
          <div className="flex items-center justify-center gap-2 mt-3">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <p className="text-amber-300 text-sm">Anda sudah mengajukan {permissionType === "izin" ? "Izin" : permissionType === "sakit" ? "Sakit" : "Libur"} hari ini</p>
          </div>
        ) : (
          <p className="text-slate-300 text-sm mt-3">Jangan lupa absen ya!</p>
        )}
      </div>

      {/* Tombol Absen */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => {
            if (isOffDay) {
              toast.info("Hari Libur", { description: `Tidak perlu absen hari ${holidayInfo.holidayName}` });
            } else if (hasPermissionToday) {
              toast.error("Tidak bisa absen", { description: `Anda sudah ${permissionType} hari ini` });
            } else {
              setOpenClockIn(true);
            }
          }}
          disabled={isOffDay || hasPermissionToday}
          className={`rounded-xl py-6 flex flex-col items-center transition active:scale-95 ${
            isOffDay
              ? "bg-purple-100 opacity-70 cursor-not-allowed"
              : hasPermissionToday
              ? "bg-gray-200 opacity-60 cursor-not-allowed"
              : todayAttendance?.attendance?.checkInTime
              ? "bg-green-50 border-2 border-green-200"
              : "bg-white hover:bg-gray-50"
          }`}>
          <svg className={`w-12 h-12 mb-2 ${isOffDay ? "text-purple-400" : todayAttendance?.attendance?.checkInTime ? "text-green-600" : "text-slate-700"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          <span className={`font-semibold ${isOffDay ? "text-purple-600" : todayAttendance?.attendance?.checkInTime ? "text-green-700" : "text-slate-800"}`}>Jam Masuk</span>
          {isOffDay ? (
            <span className="text-purple-500 text-xs mt-1">Hari Libur</span>
          ) : todayAttendance?.attendance?.checkInTime ? (
            <span className="text-green-600 text-sm font-bold mt-1">{formatTime(new Date(todayAttendance.attendance.checkInTime))}</span>
          ) : (
            <span className="text-gray-400 text-xs mt-1">Belum absen</span>
          )}
        </button>

        <button
          onClick={() => {
            if (isOffDay) {
              toast.info("Hari Libur", { description: `Tidak perlu absen hari ${holidayInfo.holidayName}` });
            } else if (hasPermissionToday) {
              toast.error("Tidak bisa absen", { description: `Anda sudah ${permissionType} hari ini` });
            } else {
              setOpenClockOut(true);
            }
          }}
          disabled={isOffDay || hasPermissionToday}
          className={`rounded-xl py-6 flex flex-col items-center transition active:scale-95 ${
            isOffDay
              ? "bg-purple-100 opacity-70 cursor-not-allowed"
              : hasPermissionToday
              ? "bg-gray-200 opacity-60 cursor-not-allowed"
              : todayAttendance?.attendance?.checkOutTime
              ? "bg-blue-50 border-2 border-blue-200"
              : "bg-white hover:bg-gray-50"
          }`}>
          <svg className={`w-12 h-12 mb-2 ${isOffDay ? "text-purple-400" : todayAttendance?.attendance?.checkOutTime ? "text-blue-600" : "text-slate-700"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className={`font-semibold ${isOffDay ? "text-purple-600" : todayAttendance?.attendance?.checkOutTime ? "text-blue-700" : "text-slate-800"}`}>Jam Pulang</span>
          {isOffDay ? (
            <span className="text-purple-500 text-xs mt-1">Hari Libur</span>
          ) : todayAttendance?.attendance?.checkOutTime ? (
            <span className="text-blue-600 text-sm font-bold mt-1">{formatTime(new Date(todayAttendance.attendance.checkOutTime))}</span>
          ) : (
            <span className="text-gray-400 text-xs mt-1">Belum absen</span>
          )}
        </button>
      </div>

      {/* DRAWER ABSEN MASUK */}
      <Drawer open={openClockIn} onOpenChange={setOpenClockIn}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-lg">
            <DrawerHeader>
              <div className="flex justify-between items-center">
                <DrawerTitle>Absen Masuk</DrawerTitle>
                <DrawerClose asChild>
                  <button className="text-3xl text-gray-500 hover:text-gray-700">×</button>
                </DrawerClose>
              </div>
            </DrawerHeader>

            <div className="px-6 pb-8">
              <p>
                Waktu: <b>{formatTime(currentTime)}</b>
              </p>
              <p className="mt-1">
                Tanggal: <b>{formatDate(currentTime)}</b>
              </p>

              <div className="mt-5">
                <p className="text-sm text-gray-600 mb-2">Status Lokasi</p>
                {clockInLocation.loading && (
                  <p className="text-sm text-blue-600 flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    Mendapatkan lokasi...
                  </p>
                )}
                {clockInLocation.error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{clockInLocation.error}</div>}
                {clockInLocation.location &&
                  (() => {
                    const { isAllowed, distance } = checkInRadius(clockInLocation.location);
                    return isAllowed ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-green-700 font-medium text-sm">Lokasi dalam radius kantor</p>
                        <p className="text-green-600 text-xs mt-1">
                          {formatCoordinates(clockInLocation.location.latitude, clockInLocation.location.longitude)} • ±{distance}m
                        </p>
                      </div>
                    ) : (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-red-700 font-medium text-sm">Di luar radius kantor!</p>
                        <p className="text-red-600 text-xs mt-1">
                          Jarak: {distance}m (maks {MAX_DISTANCE_METERS}m)
                        </p>
                      </div>
                    );
                  })()}
              </div>

              {clockInLocation.location && (
                <div className="mt-5">
                  <p className="text-sm text-gray-600 mb-2">Peta Lokasi</p>
                  <div className="rounded-lg overflow-hidden border">
                    <Suspense fallback={<div className="h-[250px] bg-gray-200 flex items-center justify-center text-gray-500">Memuat peta...</div>}>
                      <Maps height="200px" currentLocation={clockInLocation.location} />
                    </Suspense>
                  </div>
                </div>
              )}

              <button
                onClick={handleCheckIn}
                disabled={!clockInLocation.location || attendanceMutation.isPending || (clockInLocation.location && !checkInRadius(clockInLocation.location).isAllowed)}
                className={`w-full mt-4 py-2 rounded-xl font-semibold transition ${
                  !clockInLocation.location || attendanceMutation.isPending || (clockInLocation.location && !checkInRadius(clockInLocation.location).isAllowed)
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700 text-white active:scale-95"
                }`}>
                {attendanceMutation.isPending && attendanceMutation.variables?.type === "checkin" ? "Menyimpan..." : "Konfirmasi Absen Masuk"}
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* DRAWER ABSEN PULANG */}
      <Drawer open={openClockOut} onOpenChange={setOpenClockOut}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-lg">
            <DrawerHeader>
              <div className="flex justify-between items-center">
                <DrawerTitle>Absen Pulang</DrawerTitle>
                <DrawerClose asChild>
                  <button className="text-3xl text-gray-500 hover:text-gray-700">×</button>
                </DrawerClose>
              </div>
            </DrawerHeader>

            <div className="px-6 pb-8">
              <p>
                Waktu: <b>{formatTime(currentTime)}</b>
              </p>
              <p className="mt-1">
                Tanggal: <b>{formatDate(currentTime)}</b>
              </p>

              {/* STATUS LOKASI */}
              <div className="mt-6">
                <p className="text-sm font-medium text-gray-600 mb-3">Status Lokasi</p>

                {clockOutLocation.loading && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span className="text-sm">Mendapatkan lokasi...</span>
                  </div>
                )}

                {clockOutLocation.error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{clockOutLocation.error}</div>}

                {clockOutLocation.location && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-amber-800 text-xs text-center font-medium">Absen pulang tetap dapat dilakukan dari luar area kantor</p>
                  </div>
                )}
              </div>

              {/* PETA */}
              {clockOutLocation.location && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-600 mb-3">Peta Lokasi</p>
                  <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-lg">
                    <Suspense fallback={<div className="h-[250px] bg-gray-200 flex items-center justify-center text-gray-500 rounded-2xl">Memuat peta...</div>}>
                      <Maps height="200px" currentLocation={clockOutLocation.location} />
                    </Suspense>
                  </div>
                </div>
              )}

              {/* TOMBOL ABSEN PULANG */}
              <button
                onClick={handleCheckOut}
                disabled={!clockOutLocation.location || attendanceMutation.isPending}
                className={`
                w-full mt-4 py-2 rounded-xl font-semibold  transition-all duration-200 
                active:scale-95 shadow-xl select-none
                 ${
                   !clockOutLocation.location
                     ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                     : attendanceMutation.isPending
                     ? "bg-red-500 text-white cursor-wait"
                     : "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
                 }
                `}>
                {attendanceMutation.isPending && attendanceMutation.variables?.type === "checkout" ? "Menyimpan Absen Pulang..." : "Konfirmasi Absen Pulang"}
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
