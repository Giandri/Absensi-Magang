"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";

import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

import { Skeleton } from "@/components/ui/skeleton";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import { useAttendanceHistory } from "@/hooks/auth";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { Check, X, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import {
  CalendarProvider,
  CalendarHeader,
  CalendarBody,
  CalendarItem,
  Feature,
  useCalendarYear,
  useCalendarMonth,
  monthsForLocale,
  CalendarDatePagination,
  type CalendarState,
} from "@/components/kibo-ui/calendar";

import { ManualAttendanceModal } from "@/components/ManualAttendanceModal";
import { ScrollTimePicker } from "@/components/ScrollTimePicker";

interface ScrollPickerProps {
  items: string[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}

const ScrollPicker = ({ items, value, onChange, label }: ScrollPickerProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemHeight = 44; // Standard touch target height

  useEffect(() => {
    if (scrollRef.current) {
      const index = items.indexOf(value);
      if (index !== -1) {
        scrollRef.current.scrollTop = index * itemHeight;
      }
    }
  }, [value, items]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollTop = scrollRef.current.scrollTop;
      const index = Math.round(scrollTop / itemHeight);
      const newValue = items[index];
      if (newValue && newValue !== value) {
        onChange(newValue);
      }
    }
  };

  return (
    <div className="flex flex-col items-center">
      <label className="text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div
        ref={scrollRef}
        className="w-24 h-44 overflow-y-scroll no-scrollbar relative border rounded-md bg-white"
        onScroll={handleScroll}
      >
        <div className="absolute top-0 left-0 right-0 h-[calc(50%-22px)] pointer-events-none bg-gradient-to-b from-white to-transparent z-10"></div>
        <div className="absolute bottom-0 left-0 right-0 h-[calc(50%-22px)] pointer-events-none bg-gradient-to-t from-white to-transparent z-10"></div>
        <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-11 border-y border-blue-500 pointer-events-none z-0"></div>

        <div style={{ paddingTop: `calc(50% - ${itemHeight / 2}px)`, paddingBottom: `calc(50% - ${itemHeight / 2}px)` }}>
          {items.map((item, index) => (
            <div
              key={item}
              className={cn(
                "h-11 flex items-center justify-center text-lg",
                value === item ? "font-bold text-blue-600" : "text-gray-700"
              )}
              onClick={() => onChange(item)}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


const Maps = dynamic(() => import("@/components/Maps"), {
  ssr: false,
  loading: () => (
    <div className="h-48 bg-gray-200 rounded-lg flex items-center justify-center">
      <div className="text-gray-500">Memuat peta...</div>
    </div>
  ),
});

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

export default function HistoryPage() {
  const [open, setOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isEditingCheckout, setIsEditingCheckout] = useState(false);
  const [newCheckoutTime, setNewCheckoutTime] = useState("");
  const [isSavingCheckout, setIsSavingCheckout] = useState(false);
  const [nationalHolidays, setNationalHolidays] = useState<{ date: string; name: string }[]>([]);
  const [calendarYear] = useCalendarYear();
  const [calendarMonth] = useCalendarMonth();

  const currentMonthHolidays = useMemo(() => {
    return nationalHolidays.filter((h: any) => {
      const d = new Date(h.date + "T00:00:00");
      return d.getMonth() === calendarMonth;
    });
  }, [nationalHolidays, calendarMonth]);

  const { data: session } = useSession();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch National Holidays via Proxy
  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const response = await fetch(`/api/holidays?year=${calendarYear}`);
        const result = await response.json();
        if (result.status === "success") {
          setNationalHolidays(result.data);
        }
      } catch (err) {
        console.error("Failed to fetch holidays:", err);
      }
    };
    fetchHolidays();
  }, [calendarYear]);



  const userId = useMemo(() => {
    if (session?.user?.id) return session.user.id;
    if (typeof window !== "undefined") {
      try {
        const userData = localStorage.getItem("user-data");
        if (userData) return JSON.parse(userData).id;
      } catch (e) { }
    }
    return null;
  }, [session]);

  const { data: historyData, isLoading } = useAttendanceHistory(userId || undefined, 1, 100);
  const allHistoryItems: HistoryItem[] = historyData?.data?.history || [];

  const calendarFeatures: Feature[] = useMemo(() => {
    // Map existing history items
    const historyFeatures = allHistoryItems.map((item) => {
      let color = "#94a3b8"; // Default slate
      let name = "Unknown";

      if (item.type === "attendance") {
        name = item.status === "present" ? "Hadir" : item.status === "late" ? "Terlambat" : "Absen";
        color = item.status === "present" ? "#22c55e" : item.status === "late" ? "#f59e0b" : "#ef4444";
      } else {
        name = item.label;
        color = item.permissionType === "izin" ? "#3b82f6" : item.permissionType === "sakit" ? "#ec4899" : "#8b5cf6";
      }

      return {
        id: `${item.type}-${item.id}`,
        name,
        startAt: new Date(item.dateISO),
        endAt: new Date(item.dateISO),
        status: { id: item.status, name, color },
        _original: item
      } as Feature & { _original: HistoryItem };
    });

    // Map national holidays & cuti bersama
    const holidayFeatures = nationalHolidays.map((holiday: any) => {
      const isHoliday = holiday.type !== "leave";
      return {
        id: `holiday-${holiday.date}-${holiday.name}`,
        name: holiday.name,
        startAt: new Date(holiday.date + "T00:00:00"),
        endAt: new Date(holiday.date + "T00:00:00"),
        status: {
          id: isHoliday ? "holiday" : "leave",
          name: holiday.name,
          color: "#ef4444" // Merah untuk libur nasional dan cuti bersama
        },
        _original: {
          type: "permission",
          permissionType: "libur",
          emoji: isHoliday ? "📅" : "🏖️",
          label: isHoliday ? "Hari Libur Nasional" : "Cuti Bersama",
          date: holiday.date,
          dateISO: holiday.date,
          status: "libur",
          note: holiday.name,
          id: `h-${holiday.date}`
        } as Permission
      } as Feature & { _original: Permission };
    });


    return [...historyFeatures, ...holidayFeatures];
  }, [allHistoryItems, nationalHolidays]);


  const handleOpenDetail = (feature: Feature) => {
    setSelectedItem((feature as any)._original);
    setOpen(true);
    setIsEditingCheckout(false);
  };

  const handleSaveCheckout = async () => {
    if (!selectedItem || selectedItem.type !== "attendance" || !newCheckoutTime) return;

    setIsSavingCheckout(true);
    try {
      const checkOutISO = new Date(`${selectedItem.dateISO}T${newCheckoutTime}:00`).toISOString();
      const response = await fetch("/api/attendance/checkout", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedItem.dateISO,
          checkOutTime: checkOutISO,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        toast.success("Jam pulang berhasil disimpan");
        setIsEditingCheckout(false);
        // We need to refresh data. The custom hook likely allows this
        window.location.reload();
      } else {
        toast.error(result.message || "Gagal menyimpan jam pulang");
      }
    } catch (err) {
      console.error(err);
      toast.error("Terjadi kesalahan sistem");
    } finally {
      setIsSavingCheckout(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex-1 px-4 py-6 md:px-6 lg:px-8 pb-32">
        <div className="max-w-screen-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Riwayat Saya</h1>
          </div>

          <div className="bg-white overflow-hidden border-y border-gray-100 rounded-xl md:border md:rounded-3xl">
            <CalendarProvider locale="id-ID">
              <CalendarDatePagination />
              <CalendarHeader className="bg-gray-50/50 font-semibold text-gray-500 uppercase tracking-wider text-[8px]" />

              {!isMounted || isLoading ? (
                <div className="grid grid-cols-7 border-t border-gray-100">
                  {Array.from({ length: 35 }).map((_, i) => (
                    <div key={i} className="aspect-square p-2 border-r border-b border-gray-100 italic">
                      <Skeleton className="h-3 w-3 mb-1" />
                      <Skeleton className="h-2 w-full mb-1" />
                    </div>
                  ))}
                </div>
              ) : (
                <CalendarBody features={calendarFeatures}>
                  {({ feature }) => {
                    const extFeature = feature as Feature & { _original: HistoryItem };
                    return (
                      <div
                        onClick={() => handleOpenDetail(feature)}
                        key={feature.id}
                        className="w-full flex-1 text-center transition-transform active:scale-95 cursor-pointer flex flex-col"
                      >
                        <CalendarItem
                          feature={feature}
                          className="text-[9px] sm:text-[11px] px-1.5 pb-1 pt-4 border flex flex-col items-center gap-0 w-full flex-1 overflow-hidden justify-center rounded-sm"
                          style={{
                            backgroundColor: `${feature.status.color}15`,
                            borderColor: feature.status.color,
                            color: feature.status.color
                          }}
                        >
                          <span className="truncate w-full text-center font-bold leading-tight">{feature.name}</span>
                          {extFeature._original.type === "attendance" && extFeature._original.checkIn && (
                            <span className="truncate w-full text-center font-medium opacity-80 leading-tight text-[8px] sm:text-[9px]">
                              {extFeature._original.checkIn} {extFeature._original.checkOut ? `- ${extFeature._original.checkOut}` : ""}
                            </span>
                          )}
                        </CalendarItem>
                      </div>
                    )
                  }}
                </CalendarBody>
              )}
            </CalendarProvider>
          </div>

          {/* Daftar Hari Libur Nasional & Cuti Bersama */}
          {currentMonthHolidays.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900">
                Hari Libur {monthsForLocale("id-ID")[calendarMonth]} {calendarYear}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {currentMonthHolidays.map((h: any, i: number) => {
                  const isHoliday = h.type !== "leave";
                  return (
                    <div
                      key={i}
                      className="group relative flex items-center gap-5 p-5 bg-white hover:bg-gray-50/50 rounded-[28px] border border-gray-100 hover:border-red-100 shadow-sm hover:shadow-xl hover:shadow-red-500/5 transition-all duration-500 overflow-hidden cursor-pointer hover:-translate-y-1"
                    >
                      {/* Glow Effect */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-500/5 to-transparent rounded-full blur-2xl -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 text-white font-bold transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-3",
                        "bg-gradient-to-br from-red-500 to-red-600 shadow-md shadow-red-500/20 relative z-10"
                      )}>
                        <span className="text-[10px] leading-none uppercase font-bold tracking-wider opacity-90 mb-1">
                          {new Date(h.date + "T00:00:00").toLocaleDateString("id-ID", { month: "short" })}
                        </span>
                        <span className="text-xl leading-none">
                          {new Date(h.date + "T00:00:00").getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 relative z-10">
                        <p className="text-base font-bold text-gray-900 truncate group-hover:text-red-600 transition-colors leading-tight mb-2">
                          {h.name}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                            {h.day || new Date(h.date + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long" })}
                          </span>
                          <span className={cn(
                            "text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-100 transition-colors group-hover:bg-red-100/50"
                          )}>
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]"></span>
                            {isHoliday ? "Libur Nasional" : "Cuti Bersama"}
                          </span>
                        </div>
                      </div>

                      {/* Decorative Chevron */}
                      <div className="shrink-0 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500 relative z-10">
                        <ChevronRight className="w-5 h-5 text-red-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900">
                Hari Libur {monthsForLocale("id-ID")[calendarMonth]} {calendarYear}
              </h3>
              <div className="p-8 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
                  <span className="text-xl">📅</span>
                </div>
                <p className="text-sm font-bold text-gray-900">Tidak ada hari libur</p>
                <p className="text-xs text-gray-500 mt-1">Belum ada libur nasional atau cuti bersama di bulan ini.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-w-md mx-auto rounded-t-[32px]">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Detail Riwayat</DrawerTitle>
            <DrawerDescription>Informasi detail mengenai absensi atau izin.</DrawerDescription>
          </DrawerHeader>
          <div className="mx-auto w-12 h-1.5 bg-gray-200 rounded-full my-4" />

          {selectedItem && (
            <div className="px-4 sm:px-6 pb-12 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6 sm:mb-8">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                    {selectedItem.type === "attendance" ? "Detail Absensi" : "Keterangan Izin"}
                  </h2>
                  <p className="text-sm sm:text-gray-500 font-medium">{selectedItem.date}</p>
                </div>
                <div className={cn(
                  "px-3 py-1.5 sm:px-4 sm:py-2 rounded-2xl text-xs sm:text-sm font-bold shadow-sm",

                  selectedItem.status === "present" ? "bg-green-100 text-green-700" :
                    selectedItem.status === "late" ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                )}>
                  {selectedItem.type === "attendance"
                    ? (selectedItem.status === "present" ? "Hadir" : selectedItem.status === "late" ? "Terlambat" : "Absen")
                    : selectedItem.label
                  }
                </div>
              </div>

              <div className="space-y-6">
                {selectedItem.type === "attendance" ? (
                  <>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      {/* Masuk Card */}
                      <div className={cn(
                        "p-4 bg-gray-50 rounded-2xl border border-gray-100 transition-all duration-300",
                        isEditingCheckout ? "opacity-50 scale-95 origin-left" : "opacity-100"
                      )}>
                        <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1">Masuk</p>
                        <p className="text-lg sm:text-xl font-black text-gray-900">{selectedItem.checkIn || "--:--"}</p>
                      </div>

                      {/* Checkout Logic */}
                      {selectedItem.checkOut ? (
                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                          <p className="text-xs sm:text-sm font-bold text-gray-500 uppercase mb-1">Pulang</p>
                          <p className="text-xl sm:text-2xl font-black text-gray-900">{selectedItem.checkOut}</p>
                        </div>
                      ) : (
                        (() => {
                          const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
                          const isToday = selectedItem.dateISO === todayStr;

                          if (isToday) {
                            return (
                              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
                                <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase mb-1">Pulang</p>
                                <p className="text-lg sm:text-xl font-black text-gray-300">--:--</p>
                              </div>
                            );
                          }

                          return (
                            <div className={cn(
                              "relative transition-all duration-500 ease-out-expo",
                              isEditingCheckout ? "col-span-2" : "col-span-1"
                            )}>
                              {isEditingCheckout ? (
                                <div className="p-3 bg-white rounded-3xl border-2 border-yellow-400/20 shadow-xl shadow-yellow-900/5 flex items-center justify-between gap-4 w-full animate-in slide-in-from-bottom-4 duration-500">
                                  <div className="flex-1">
                                    <ScrollTimePicker
                                      value={newCheckoutTime || "17:00"}
                                      onChange={setNewCheckoutTime}
                                    />
                                  </div>
                                  <div className="flex gap-2 pr-2">
                                    <button
                                      onClick={handleSaveCheckout}
                                      disabled={isSavingCheckout || !newCheckoutTime}
                                      className="w-12 h-12 bg-yellow-400 text-black rounded-2xl hover:bg-yellow-500 transition-all active:scale-90 disabled:opacity-50 flex items-center justify-center shadow-lg shadow-yellow-400/20"
                                      title="Simpan"
                                    >
                                      {isSavingCheckout ? <Loader2 className="h-6 w-6 animate-spin" /> : <Check className="h-6 w-6" />}
                                    </button>
                                    <button
                                      onClick={() => setIsEditingCheckout(false)}
                                      className="w-12 h-12 bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-100 transition-all active:scale-90 flex items-center justify-center border border-gray-100"
                                      title="Batal"
                                    >
                                      <X className="h-6 w-6" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  onClick={() => {
                                    setIsEditingCheckout(true);
                                    setNewCheckoutTime("16:00");
                                  }}
                                  className="h-full p-4 bg-yellow-50 rounded-2xl border-2 border-dashed border-yellow-200 cursor-pointer hover:bg-yellow-100 transition-all active:scale-95 group flex flex-col justify-center"
                                >
                                  <p className="text-[10px] sm:text-xs font-bold text-yellow-600 uppercase mb-1 group-hover:text-yellow-700">Pulang</p>
                                  <p className="text-lg sm:text-xl font-black text-yellow-400 group-hover:text-yellow-500">--:--</p>
                                </div>
                              )}
                            </div>
                          );
                        })()
                      )}
                    </div>





                    {(() => {

                      const lat = Number(selectedItem.checkInLatitude || selectedItem.checkOutLatitude);
                      const lng = Number(selectedItem.checkInLongitude || selectedItem.checkOutLongitude);
                      if (!lat || !lng) return null;
                      return (
                        <div className="space-y-3">
                          <p className="text-sm font-bold text-gray-900">Lokasi Presensi</p>
                          <div className="rounded-[24px] overflow-hidden border border-gray-100 shadow-inner">
                            <Maps height="200px" currentLocation={{ latitude: lat, longitude: lng }} />
                          </div>
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{selectedItem.emoji}</span>
                      <p className="text-lg font-bold text-indigo-900">{selectedItem.label}</p>
                    </div>
                    {selectedItem.note && (
                      <p className="text-indigo-800 text-sm leading-relaxed italic">
                        "{selectedItem.note}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      <Navbar />
    </div >


  );
}
