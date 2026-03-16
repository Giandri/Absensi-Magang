"use client";

import { useState, useMemo, useEffect, useRef } from "react";

import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";


import { Skeleton } from "@/components/ui/skeleton";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import { useAttendanceHistory } from "@/hooks/auth";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  CalendarProvider,
  CalendarHeader,
  CalendarBody,
  CalendarItem,
  CalendarDate,
  CalendarDatePicker,
  CalendarMonthPicker,
  CalendarYearPicker,
  CalendarDatePagination,
  Feature,
  useCalendarYear
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

    // Map national holidays
    const holidayFeatures = nationalHolidays.map((holiday) => {
      return {
        id: `holiday-${holiday.date}`,
        name: holiday.name,
        startAt: new Date(holiday.date),
        endAt: new Date(holiday.date),
        status: { id: "holiday", name: holiday.name, color: "#4f46e5" }, // Indigo for holidays
        _original: {
          type: "permission",
          permissionType: "libur",
          emoji: "📅",
          label: "Hari Libur Nasional",
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
      const response = await fetch("/api/admin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId,
          date: selectedItem.dateISO,
          checkOutTime: checkOutISO,
          // Since it's an update, we only need these
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

          <div className="bg-white overflow-hidden border-y border-gray-100 md:border md:rounded-3xl">
            <CalendarProvider locale="id-ID">

              <CalendarDate>
                <CalendarDatePicker>
                  <CalendarMonthPicker className="border-none shadow-none font-bold text-lg" />
                  <CalendarYearPicker start={2024} end={2026} className="border-none shadow-none font-bold text-lg" />
                </CalendarDatePicker>
                <CalendarDatePagination />
              </CalendarDate>

              <CalendarHeader className="bg-gray-50/50 font-semibold text-gray-500 uppercase tracking-wider text-[10px]" />

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
                  {({ feature }) => (
                    <div
                      onClick={() => handleOpenDetail(feature)}
                      key={feature.id}
                      className="w-full text-left transition-transform active:scale-95 mb-1 cursor-pointer"
                    >
                      <CalendarItem
                        feature={feature}
                        className="text-[8px] sm:text-[10px] py-0 px-0.5 sm:py-0.5 sm:px-1 rounded-sm sm:rounded-md border truncate"
                        style={{
                          backgroundColor: `${feature.status.color}15`,
                          borderColor: `${feature.status.color}30`,
                          color: feature.status.color
                        }}
                      />

                    </div>
                  )}
                </CalendarBody>
              )}
            </CalendarProvider>
          </div>
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
                      {/* Masuk Card - Always visible */}
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
                                setNewCheckoutTime("17:00");
                              }}
                              className="h-full p-4 bg-yellow-50 rounded-2xl border-2 border-dashed border-yellow-200 cursor-pointer hover:bg-yellow-100 transition-all active:scale-95 group flex flex-col justify-center"
                            >
                              <p className="text-[10px] sm:text-xs font-bold text-yellow-600 uppercase mb-1 group-hover:text-yellow-700">Pulang</p>
                              <p className="text-lg sm:text-xl font-black text-yellow-400 group-hover:text-yellow-500">Isi Jam</p>
                            </div>
                          )}
                        </div>
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
    </div>


  );
}
