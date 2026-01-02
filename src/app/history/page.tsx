"use client";

import { useState, useMemo, Suspense } from "react";
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import { useAttendanceHistory } from "@/hooks/auth";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { Calendar, FileText, Stethoscope, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type FilterMode = "week" | "month";

// Helper function to get week range (Monday to Sunday) for a given date
const getWeekRange = (date: Date): { start: Date; end: Date } => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Adjust to Monday

  const start = new Date(d);
  start.setDate(d.getDate() + diff);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

// Format week range label
const formatWeekLabel = (start: Date, end: Date): string => {
  const startLabel = start.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  const endLabel = end.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  return `${startLabel} - ${endLabel}`;
};

// Helper function to get month range for a given date
const getMonthRange = (date: Date): { start: Date; end: Date } => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

// Format month label
const formatMonthLabel = (date: Date): string => {
  return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
};

// Get initial week range (current week)
const getInitialWeekRange = () => getWeekRange(new Date());

// Get initial month range (current month)
const getInitialMonthRange = () => getMonthRange(new Date());

type LatLng = { latitude: number; longitude: number };

const Maps = dynamic(() => import("@/components/Maps"), {
  ssr: false,
  loading: () => (
    <div className="h-48 bg-gray-200 rounded-lg flex items-center justify-center">
      <div className="text-gray-500">Memuat peta...</div>
    </div>
  ),
});

const HistorySkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-6 w-32" />
    <div className="space-y-3">
      {[1, 2, 3].map((index) => (
        <div key={index} className="bg-white rounded-lg p-4 shadow-sm space-y-3">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

interface Absence {
  id: string;
  date: string;
  dateISO: string;
  status: string;
  checkIn: string | null;
  checkOut: string | null;
  checkInLocation: string | null;
  checkOutLocation: string | null;
  checkInLatitude?: number | string | null;
  checkInLongitude?: number | string | null;
  checkOutLatitude?: number | string | null;
  checkOutLongitude?: number | string | null;
  duration: number | null;
}

interface Permission {
  id: string;
  type: "permission";
  permissionType: "izin" | "sakit" | "libur";
  date: string;
  dateISO: string;
  status: string;
  note: string | null;
  label: string;
  emoji: string;
}

type HistoryItem = (Absence & { type: "attendance" }) | Permission;

const getAbsenceLocation = (absence: Absence): { coords: LatLng | null; label: string | null } => {
  let lat: number | null = null;
  let lng: number | null = null;

  const rawLat = absence.checkInLatitude ?? absence.checkOutLatitude;
  const rawLng = absence.checkInLongitude ?? absence.checkOutLongitude;

  if (rawLat != null && rawLng != null) {
    lat = Number(rawLat);
    lng = Number(rawLng);
  }

  if ((lat === null || lng === null) && (absence.checkInLocation || absence.checkOutLocation)) {
    const text = absence.checkInLocation || absence.checkOutLocation || "";
    const matches = text.match(/-?\d+\.?\d*/g);
    if (matches && matches.length >= 2) {
      lat = parseFloat(matches[0]);
      lng = parseFloat(matches[1]);
    }
  }

  if (lat !== null && lng !== null && lat > 0 && lat < 10 && lng >= 95 && lng <= 141) {
    lat = -lat;
  }

  const coords = lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng) ? { latitude: lat, longitude: lng } : null;
  const label = absence.checkInLocation || absence.checkOutLocation || null;

  return { coords, label };
};

export default function AbsenceDetailDrawer() {
  const [open, setOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("week");
  const [weekRange, setWeekRange] = useState<{ start: Date; end: Date }>(getInitialWeekRange());
  const [selectedWeekDate, setSelectedWeekDate] = useState<Date | undefined>(new Date());
  const [weekCalendarOpen, setWeekCalendarOpen] = useState(false);
  const [monthRange, setMonthRange] = useState<{ start: Date; end: Date }>(getInitialMonthRange());
  const [selectedMonthDate, setSelectedMonthDate] = useState<Date | undefined>(new Date());
  const [monthCalendarOpen, setMonthCalendarOpen] = useState(false);

  const { data: session } = useSession();

  // Handle date selection from week calendar
  const handleWeekDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedWeekDate(date);
      const range = getWeekRange(date);
      setWeekRange(range);
      setWeekCalendarOpen(false);
    }
  };

  // Handle date selection from month calendar
  const handleMonthDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedMonthDate(date);
      const range = getMonthRange(date);
      setMonthRange(range);
      setMonthCalendarOpen(false);
    }
  };
  const userId = useMemo(() => {
    if (session?.user?.id) return session.user.id;
    if (typeof window !== "undefined") {
      try {
        const userData = localStorage.getItem("user-data");
        if (userData) {
          const user = JSON.parse(userData);
          return user.id;
        }
      } catch (error) {
        console.error("Error parsing user data from localStorage:", error);
      }
    }
    return null;
  }, [session]);

  const { data: historyData, isLoading, error } = useAttendanceHistory(userId || undefined, 1, 100);

  const allHistoryItems: HistoryItem[] = historyData?.data?.history || [];
  const summary = historyData?.data?.summary;

  // Filter history items based on selected week or month
  const historyItems = useMemo(() => {
    if (filterMode === "week") {
      return allHistoryItems.filter((item) => {
        const itemDate = new Date(item.dateISO);
        return itemDate >= weekRange.start && itemDate <= weekRange.end;
      });
    } else {
      return allHistoryItems.filter((item) => {
        const itemDate = new Date(item.dateISO);
        return itemDate >= monthRange.start && itemDate <= monthRange.end;
      });
    }
  }, [allHistoryItems, filterMode, weekRange, monthRange]);

  // Get selected filter label for display
  const selectedFilterLabel = useMemo(() => {
    if (filterMode === "week") {
      return formatWeekLabel(weekRange.start, weekRange.end);
    } else {
      return formatMonthLabel(monthRange.start);
    }
  }, [filterMode, weekRange, monthRange]);

  const handleOpenDetail = (item: HistoryItem) => {
    setSelectedItem(item);
    setOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header />
      <div className="flex-1 px-4 py-4 md:px-6 lg:px-8 pb-24">
        {isLoading && (
          <div className="bg-gray-200 rounded-lg p-4 mb-4">
            <HistorySkeleton />
          </div>
        )}

        {!isLoading && (
          <div className="bg-gray-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Riwayat Aktivitas</h2>
              {summary && (
                <div className="text-xs text-gray-600">
                  {summary.totalAttendance} absen • {summary.totalPermission} izin
                </div>
              )}
            </div>

            {/* Filter Mode Tabs */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setFilterMode("week")}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${filterMode === "week" ? "bg-yellow-400 text-black shadow-sm" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                Minggu
              </button>
              <button
                onClick={() => setFilterMode("month")}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${filterMode === "month" ? "bg-yellow-400 text-black shadow-sm" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                Bulan
              </button>
            </div>

            {/* Filter Dropdown */}
            <div className="mb-4">
              {filterMode === "week" ? (
                <Popover open={weekCalendarOpen} onOpenChange={setWeekCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-white", !selectedWeekDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formatWeekLabel(weekRange.start, weekRange.end)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent mode="single" selected={selectedWeekDate} onSelect={handleWeekDateSelect} initialFocus />
                  </PopoverContent>
                </Popover>
              ) : (
                <Popover open={monthCalendarOpen} onOpenChange={setMonthCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-white", !selectedMonthDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formatMonthLabel(monthRange.start)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent mode="single" selected={selectedMonthDate} onSelect={handleMonthDateSelect} initialFocus />
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-700 text-sm">Gagal memuat riwayat: {error.message}</p>
              </div>
            )}

            {!error && historyItems.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">Tidak ada riwayat untuk {selectedFilterLabel}</p>
              </div>
            )}

            <div className="space-y-3">
              {historyItems.map((item) => (
                <div key={`${item.type}-${item.id}`} className="bg-white rounded-lg p-4 shadow-sm">
                  {/* ABSENSI*/}
                  {item.type === "attendance" && (
                    <>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-xs text-gray-600">{item.date}</p>
                          <p className="font-semibold text-gray-800 capitalize">{item.status === "present" ? "Hadir" : item.status === "late" ? "Terlambat" : item.status === "absent" ? "Tidak Hadir" : item.status}</p>
                        </div>
                        <button onClick={() => handleOpenDetail(item)} className="px-4 py-1 border-2 border-gray-800 text-gray-800 rounded-full text-sm font-medium hover:bg-gray-800 hover:text-white transition">
                          Detail
                        </button>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-green-600 text-sm">
                          {item.checkIn ? (
                            <>
                              Masuk: {item.checkIn}
                              {item.checkOut && (
                                <>
                                  {" - "}
                                  <span className="text-red-600">Pulang: {item.checkOut}</span>
                                </>
                              )}
                            </>
                          ) : (
                            <span className="text-gray-500">Belum check-in</span>
                          )}
                        </p>
                        {item.duration && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{item.duration} jam</span>}
                      </div>
                    </>
                  )}

                  {/* KET IZIN */}
                  {item.type === "permission" && (
                    <>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.permissionType === "izin" ? "bg-amber-100" : item.permissionType === "sakit" ? "bg-red-100" : "bg-blue-100"}`}>
                            {item.permissionType === "izin" ? (
                              <FileText className="w-5 h-5 text-amber-600" />
                            ) : item.permissionType === "sakit" ? (
                              <Stethoscope className="w-5 h-5 text-red-600" />
                            ) : (
                              <Calendar className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">{item.date}</p>
                            <p className="font-semibold text-gray-800">{item.label}</p>
                          </div>
                        </div>
                        <button onClick={() => handleOpenDetail(item)} className="px-4 py-1 border-2 border-gray-800 text-gray-800 rounded-full text-sm font-medium hover:bg-gray-800 hover:text-white transition">
                          Detail
                        </button>
                      </div>
                      {item.note && <p className="text-sm text-gray-600 italic line-clamp-1">{item.note}</p>}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* DRAWER DETAIL ABSENSI & IZIN */}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <div className="mx-auto w-full">
            <DrawerHeader>
              <div className="flex justify-between items-center">
                <DrawerTitle>Detail {selectedItem?.type === "attendance" ? "Absensi" : "Permission"}</DrawerTitle>
                <DrawerClose asChild>
                  <button className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
                </DrawerClose>
              </div>
            </DrawerHeader>

            {selectedItem && (
              <div className="px-6 py-4 pb-8 max-h-[70vh] overflow-y-auto">
                {/* DETAIL ABSENSI */}
                {selectedItem.type === "attendance" && (
                  <>
                    <div className="flex justify-end mb-6">
                      <span
                        className={`text-white px-5 py-1.5 rounded-full text-sm font-medium ${
                          selectedItem.status === "present" ? "bg-green-500" : selectedItem.status === "late" ? "bg-yellow-500" : selectedItem.status === "absent" ? "bg-red-500" : "bg-gray-500"
                        }`}>
                        {selectedItem.status === "present" ? "Hadir" : selectedItem.status === "late" ? "Terlambat" : selectedItem.status === "absent" ? "Tidak Hadir" : selectedItem.status}
                      </span>
                    </div>

                    <div className="mb-5">
                      <p className="text-sm text-gray-600 mb-1">Tanggal</p>
                      <p className="font-semibold text-gray-800">{selectedItem.date}</p>
                    </div>

                    <div className="mb-5">
                      <p className="text-sm text-green-600 mb-1">Check-In</p>
                      <p className="font-semibold text-gray-800">{selectedItem.checkIn || "Belum check-in"}</p>
                    </div>

                    <div className="mb-5">
                      <p className="text-sm text-red-600 mb-1">Check-Out</p>
                      <p className="font-semibold text-gray-800">{selectedItem.checkOut || "Belum check-out"}</p>
                    </div>

                    {selectedItem.duration && (
                      <div className="mb-5">
                        <p className="text-sm text-blue-600 mb-1">Durasi Kerja</p>
                        <p className="font-semibold text-gray-800">{selectedItem.duration} jam</p>
                      </div>
                    )}

                    {(() => {
                      const { coords, label } = getAbsenceLocation(selectedItem);
                      if (!coords && !label) return null;
                      return (
                        <div className="mb-6">
                          <p className="text-sm text-gray-600 mb-2">Lokasi Absen</p>
                          {coords && (
                            <p className="text-xs text-gray-500 mb-3 font-mono">
                              {coords.latitude.toFixed(6)}°, {coords.longitude.toFixed(6)}°
                            </p>
                          )}
                          {coords && (
                            <div className="rounded-lg overflow-hidden border">
                              <Suspense
                                fallback={
                                  <div className="h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                                    <div className="text-gray-500">Memuat peta...</div>
                                  </div>
                                }>
                                <Maps height="200px" currentLocation={coords} />
                              </Suspense>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
                )}

                {/*  DETAIL IZIN  */}
                {selectedItem.type === "permission" && (
                  <>
                    <div className="mb-5">
                      <p className="text-sm text-gray-600 mb-1">Jenis</p>
                      <p className="font-semibold text-gray-800 text-lg">
                        {selectedItem.emoji} {selectedItem.label}
                      </p>
                    </div>

                    <div className="mb-5">
                      <p className="text-sm text-gray-600 mb-1">Tanggal</p>
                      <p className="font-semibold text-gray-800">{selectedItem.date}</p>
                    </div>

                    {selectedItem.note && (
                      <div className="mb-5">
                        <p className="text-sm text-gray-600 mb-1">Keterangan</p>
                        <p className="text-gray-800 bg-gray-50 p-3 rounded-lg">{selectedItem.note}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <Navbar />
    </div>
  );
}
