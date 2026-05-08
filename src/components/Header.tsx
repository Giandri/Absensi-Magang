"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";


import { useSession } from "next-auth/react";
import { Bell, HelpCircle, ChevronRight, User, CheckCircle, FileText } from "lucide-react";


import NotificationBell from "./NotificationBell";

export default function Header() {
  const { data: session } = useSession();

  const [stats, setStats] = React.useState({
    presentCount: 0,
    permissionCount: 0,
    remainingQuota: 3
  });

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/stats/monthly");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch monthly stats:", error);
      }
    };

    if (session?.user?.id) {
      fetchStats();
    }
  }, [session]);

  const userName = session?.user?.name || "Peserta Magang";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="relative bg-white pb-6">
      {/* Top Bar: Profile & Brand */}
      <div className="max-w-md mx-auto px-5 pt-8 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-white flex items-center justify-center shadow-sm relative overflow-hidden group active:scale-95 transition-all cursor-pointer border border-gray-100 p-1.5">
            <div className="relative w-full h-full">
              <Image
                src="/images/bws icon.png"
                alt="BWS Logo"
                fill
                className="object-contain z-10"
              />
            </div>
            <Image
              src="/images/batik.png"
              alt="Batik"
              fill
              className="object-cover opacity-5 absolute inset-0"
            />
          </div>
          <div>
            <h1 className="text-sm font-black text-gray-900 leading-tight flex items-center gap-1">
              {userName}
              <ChevronRight className="w-3 h-3 text-gray-400" />
            </h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-0.5">
              {session?.user?.position || "Peserta Magang BWS Babel"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button className="w-9 h-9 rounded-full hover:bg-gray-50 flex items-center justify-center text-gray-400 transition-all active:scale-90" title="Bantuan">
            <HelpCircle className="w-5 h-5" />
          </button>
          <NotificationBell />
        </div>
      </div>

      {/* Quick Stats Bar (Solid Yellow & Batik Theme) */}
      <div className="max-w-md mx-auto px-5">
        <div className="bg-yellow-400 rounded-[32px] p-2 shadow-22xl shadow-yellow-200/50 flex items-center gap-1 relative overflow-hidden group border border-white/40">
          {/* Subtle Glows for depth */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/30 blur-3xl rounded-full" />

          {/* Batik Pattern Overlay - Refined Blending */}
          <div className="absolute inset-0 opacity-[0.12] pointer-events-none mix-blend-overlay">
            <Image
              src="/images/batik.png"
              alt="Batik"
              fill
              className="object-cover scale-150 rotate-[-5deg]"
            />
          </div>

          <div className="relative z-10 flex-1 grid grid-cols-3 gap-1.5 p-1">
            {/* Stat Item: Hadir (Glassmorphism) */}
            <div className="flex flex-col items-center justify-center py-3 rounded-[24px] bg-white/20 backdrop-blur-md border border-white/20 hover:bg-white/30 transition-all cursor-default shadow-sm">
              <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center mb-1.5">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <p className="text-[12px] font-black text-white leading-none">{stats.presentCount.toString().padStart(2, '0')}</p>
              <span className="text-[8px] font-black text-white uppercase tracking-wider mt-1">Hadir</span>
            </div>

            {/* Stat Item: Izin (Glassmorphism) */}
            <div className="flex flex-col items-center justify-center py-3 rounded-[24px] bg-white/20 backdrop-blur-md border border-white/20 hover:bg-white/30 transition-all cursor-default shadow-sm">
              <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center mb-1.5">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <p className="text-[12px] font-black text-white leading-none">{stats.permissionCount.toString().padStart(2, '0')}</p>
              <span className="text-[8px] font-black text-white uppercase tracking-wider mt-1">Izin</span>
            </div>

            {/* Stat Item: Kuota (Glassmorphism) */}
            <div className="flex flex-col items-center justify-center py-3 rounded-[24px] bg-white/20 backdrop-blur-md border border-white/20 hover:bg-white/30 transition-all cursor-default shadow-sm">
              <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center mb-1.5">
                <div className="text-[10px] font-black text-white">{stats.remainingQuota}</div>
              </div>
              <p className="text-[12px] font-black text-white leading-none">Sisa</p>
              <span className="text-[8px] font-black text-white uppercase tracking-wider mt-1">Kuota</span>
            </div>
          </div>

          {/* Action divider */}
          <div className="h-16 w-px bg-white/20 mx-1 relative z-10" />

          <Link href="/history" className="relative z-10 flex flex-col items-center justify-center px-4 h-20 rounded-[28px] hover:bg-white/10 transition-all active:scale-95 group">
            <div className="w-10 h-10 rounded-2xl bg-white text-yellow-500 flex items-center justify-center mb-1.5 group-hover:bg-yellow-50 transition-all shadow-lg shadow-yellow-900/10">
              <ChevronRight className="w-6 h-6" />
            </div>
            <span className="text-[8px] font-black text-white uppercase tracking-widest">Riwayat</span>
          </Link>

        </div>
      </div>
    </header>
  );
}

