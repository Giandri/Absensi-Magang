"use client";
import Link from "next/link";
import { Home, User, Clock as ClockIcon, Bell, QrCode } from "lucide-react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      if (session) {
        setIsAuthenticated(true);
        return;
      }
      if (typeof window !== "undefined") {
        const authToken = localStorage.getItem("auth-token");
        const userData = localStorage.getItem("user-data");
        if (authToken && userData) {
          setIsAuthenticated(true);
          return;
        }
      }
      setIsAuthenticated(false);
    };
    checkAuth();
  }, [session]);

  const profileHref = isAuthenticated ? "/profile" : "/login";
  const profileActive = isAuthenticated ? pathname === "/profile" : pathname === "/login";

  const NavItem = ({ href, icon: Icon, label, active, isCenter = false }: { href: string; icon: any; label: string; active: boolean; isCenter?: boolean }) => {
    if (isCenter) {
      return (
        <Link
          href={href}
          className="relative -top-8 flex flex-col items-center group"
        >
          <div className="w-16 h-16 rounded-full bg-yellow-400 border-[6px] border-gray-100 shadow-xl flex items-center justify-center group-active:scale-90 transition-all duration-300">
            <QrCode className="w-8 h-8 text-white font-black" />
          </div>
          <span className="text-[10px] font-black uppercase text-gray-400 mt-2 tracking-tighter group-active:text-yellow-600 transition-colors">Presensi</span>
        </Link>
      );
    }

    return (
      <Link
        href={href}
        className={cn(
          "flex flex-col items-center justify-center h-full gap-1 transition-all duration-300 relative px-2",
          active ? "text-yellow-500" : "text-gray-400 hover:text-gray-600"
        )}
      >
        <div className={cn(
          "p-1.5 rounded-xl transition-all duration-300",
          active ? "bg-yellow-50" : "bg-transparent"
        )}>
          <Icon className={cn("w-6 h-6", active ? "stroke-[3px]" : "stroke-[2px]")} />
        </div>
        <span className={cn(
          "text-[9px] font-black uppercase tracking-tight transition-all duration-300",
          active ? "opacity-100" : "opacity-60"
        )}>
          {label}
        </span>
        {active && (
          <div className="absolute -top-1 w-1 h-1 bg-yellow-500 rounded-full animate-pulse" />
        )}
      </Link>
    );
  };

  return (
    <nav className="fixed bottom-2 left-5 right-5 z-50 bg-white/80 backdrop-blur-xl border border-white/20 px-2 h-20 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-xl">
      <div className="max-w-md mx-auto flex items-center justify-around h-full">

        <NavItem
          href="/"
          icon={Home}
          label="Home"
          active={pathname === "/"}
        />
        <NavItem
          href="/history"
          icon={ClockIcon}
          label="Riwayat"
          active={pathname === "/history"}
        />
        <NavItem
          href={profileHref}
          icon={User}
          label="Profil"
          active={profileActive}
        />
      </div>
    </nav>
  );
}



