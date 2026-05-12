"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";


import { useSession } from "next-auth/react";
import { Bell, HelpCircle, ChevronRight, User, CheckCircle, FileText } from "lucide-react";


import NotificationBell from "./NotificationBell";
import { cn } from "@/lib/utils";

export default function Header() {
  const { data: session } = useSession();

  const [stats, setStats] = React.useState({
    presentCount: 0,
    permissionCount: 0,
    remainingQuota: 3
  });
  const [profile, setProfile] = React.useState<{ position?: string } | null>(null);

  const bgImages = [
    "/images/bg/kantor bws.jpeg",
    "/images/bg/metukul.png",
    "/images/bg/metukul2.png"
  ];
  const [currentBg, setCurrentBg] = React.useState(0);

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

    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          if (data.data) {
            setProfile(data.data);
          }
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      }
    };

    if (session?.user?.id) {
      fetchStats();
      fetchProfile();
    }
  }, [session]);

  // Carousel auto-play
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % bgImages.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const userName = session?.user?.name || "Peserta Magang";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="relative pb-4 overflow-hidden">
      {/* Background Carousel */}
      <div className="absolute inset-0 z-0">
        {bgImages.map((src, idx) => (
          <Image
            key={src}
            src={src}
            alt="Background"
            fill
            priority={idx === 0}
            className={`object-cover transition-opacity duration-1000 ${currentBg === idx ? "opacity-100" : "opacity-0"
              }`}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50 via-white/80 to-white/30"></div>
      </div>

      <div className="relative z-10">
        <div className="max-w-md mx-auto px-5 pt-6 pb-3 flex items-center justify-between">
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
            <Link href="/profile" className="hover:opacity-80 transition-opacity">
              <div>
                <h1 className="text-sm font-black text-gray-900 leading-tight flex items-center gap-1">
                  {userName}
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                </h1>
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest leading-none mt-0.5">
                  {profile?.position || session?.user?.position || "Peserta Magang BWS Babel"}
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-1">
            <button className="w-9 h-9 rounded-full bg-white/50 backdrop-blur-sm hover:bg-white flex items-center justify-center text-gray-600 transition-all active:scale-90" title="Bantuan">
              <HelpCircle className="w-5 h-5" />
            </button>
            <div className="bg-white/50 backdrop-blur-sm rounded-full">
              <NotificationBell />
            </div>
          </div>
        </div>
        <div className="max-w-md mx-auto px-5">
          <div className="bg-yellow-400 rounded-3xl p-1.5 shadow-2xl shadow-yellow-400/30 flex items-center gap-1 relative overflow-hidden group border border-white/40">
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

            <div className="relative z-10 flex-1 grid grid-cols-3 gap-1 p-0.5">
              {/* Stat Item: Hadir (Glassmorphism) */}
              <div className="flex flex-col items-center justify-center py-2 rounded-2xl bg-white/20 backdrop-blur-md border border-white/20 hover:bg-white/30 transition-all cursor-default shadow-sm">
                <div className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center mb-1">
                  <CheckCircle className="w-3.5 h-3.5 text-white" />
                </div>
                <p className="text-[11px] font-black text-white leading-none">{stats.presentCount.toString().padStart(2, '0')}</p>
                <span className="text-[7px] font-black text-white uppercase tracking-wider mt-0.5">Hadir</span>
              </div>

              {/* Stat Item: Izin (Glassmorphism) */}
              <div className="flex flex-col items-center justify-center py-2 rounded-2xl bg-white/20 backdrop-blur-md border border-white/20 hover:bg-white/30 transition-all cursor-default shadow-sm">
                <div className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center mb-1">
                  <FileText className="w-3.5 h-3.5 text-white" />
                </div>
                <p className="text-[11px] font-black text-white leading-none">{stats.permissionCount.toString().padStart(2, '0')}</p>
                <span className="text-[7px] font-black text-white uppercase tracking-wider mt-0.5">Izin</span>
              </div>

              {/* Stat Item: Kuota (Glassmorphism) */}
              <div className="flex flex-col items-center justify-center py-2 rounded-2xl bg-white/20 backdrop-blur-md border border-white/20 hover:bg-white/30 transition-all cursor-default shadow-sm">
                <div className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center mb-1">
                  <div className="text-[9px] font-black text-white">{stats.remainingQuota}</div>
                </div>
                <p className="text-[11px] font-black text-white leading-none">Sisa</p>
                <span className="text-[7px] font-black text-white uppercase tracking-wider mt-0.5">Kuota</span>
              </div>
            </div>

            {/* Action divider */}
            <div className="h-10 w-px bg-white/20 mx-1 relative z-10" />

            <Link href="/history" className="relative z-10 flex flex-col items-center justify-center px-3 h-14 rounded-2xl hover:bg-white/10 transition-all active:scale-95 group">
              <div className="w-7 h-7 rounded-xl bg-white text-yellow-500 flex items-center justify-center mb-1 group-hover:bg-yellow-50 transition-all shadow-md shadow-yellow-900/10">
                <ChevronRight className="w-4 h-4" />
              </div>
              <span className="text-[7px] font-black text-white uppercase tracking-widest">Riwayat</span>
            </Link>

          </div>
        </div>
      </div>
    </header>
  );
}

