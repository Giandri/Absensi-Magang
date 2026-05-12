"use client";

import Navbar from "@/components/Navbar";
import Header from "@/components/Header";
import Clock from "@/components/Clock";
import Permission from "@/components/Permission";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useState, useMemo } from "react";
import { ManualAttendanceModal } from "@/components/ManualAttendanceModal";
import { useSession } from "next-auth/react";
import { useTodayAttendance } from "@/hooks/auth";
import { useEffect } from "react";

const Maps = dynamic(() => import("@/components/Maps"), {
  ssr: false,
  loading: () => (
    <div className="bg-white rounded-2xl p-5 shadow-lg">
      <div className="h-[300px] bg-gray-200 rounded-lg flex items-center justify-center">
        <div className="text-gray-500">Memuat peta...</div>
      </div>
    </div>
  ),
});

export default function AbsenApp() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [allowManualAttendance, setAllowManualAttendance] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    // Check global setting AND user permission
    Promise.all([
      fetch("/api/admin/settings").then((r) => r.json()),
      fetch("/api/profile").then((r) => r.json()),
    ])
      .then(([settingsData, profileData]) => {
        const globalEnabled = settingsData?.data?.allowManualAttendance === true;
        const userAllowed = profileData?.data?.canManualAttendance === true;
        setAllowManualAttendance(globalEnabled && userAllowed);
      })
      .catch((err) => console.error(err));
  }, []);

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

  const { data: todayAttendance } = useTodayAttendance(userId || undefined);
  const hasCheckedIn = !!todayAttendance?.attendance?.checkInTime;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
      {/* Header */}
      <Header />

      
      {/* Main Content Area */}
      <main className="flex-1 px-4 pt-2 pb-24 overflow-y-auto">
        <div className="max-w-md mx-auto space-y-4">
          
          {/* Section: MAIN CLOCK */}
          <section>
            <Clock />
          </section>

          {allowManualAttendance && (
            <section className="space-y-3">
               <div className="flex items-center justify-between px-1">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Opsi Lainnya</h3>
               </div>
               <ManualAttendanceModal 
                  open={isModalOpen} 
                  onOpenChange={setIsModalOpen} 
                  trigger={
                    <Button onClick={() => setIsModalOpen(true)} className="w-full bg-white hover:bg-yellow-50 text-slate-700 border-2 border-dashed border-slate-100 hover:border-yellow-200 shadow-none flex items-center justify-between px-4 h-12 rounded-xl font-black text-[11px] transition-all active:scale-[0.98] group">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-yellow-100 flex items-center justify-center group-hover:bg-yellow-500 transition-colors">
                          <PlusCircle className="h-3.5 w-3.5 text-yellow-600 group-hover:text-white" />
                        </div>
                        <span>ABSEN MANUAL</span>
                      </div>
                      <div className="w-5 h-5 rounded-full bg-slate-50 flex items-center justify-center">
                         <PlusCircle className="h-3 w-3 text-slate-300" />
                      </div>
                    </Button>
                  }
                />
            </section> 
          )}

          {/* Section: PERMISSION */}
          <section>
             <Permission hasCheckedIn={hasCheckedIn} />
          </section>


          {/* Section: LOCATION TRACKING */}
          <section className="space-y-2 pb-4">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lokasi Sekarang</h3>
                <span className="text-[8px] font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded cursor-default">GPS</span>
            </div>
            <div className="rounded-2xl overflow-hidden border-2 border-white shadow-lg bg-white aspect-square">
              <Maps height="100%" />
            </div>
          </section>
        </div>
      </main>

      {/* Bottom Navigation */}
      <Navbar />

    </div>
  );
}
