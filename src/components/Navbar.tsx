"use client";
import Link from "next/link";
import { Home, User, ClipboardClock } from "lucide-react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
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

  console.log("Navbar session status:", status, "session:", session, "isAuthenticated:", isAuthenticated);


  const profileHref = isAuthenticated ? "/profile" : "/login";
  const profileActive = isAuthenticated ? pathname === "/profile" : pathname === "/login";

  console.log("Profile href:", profileHref, "Active:", profileActive);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-yellow-400 to-yellow-500 shadow-2xl border-yellow-600 z-50">
      <div className=" mx-auto px-2">
        <div className="grid grid-cols-3 gap-2 py-3">
          {/* Home Tab */}
          <Link href="/" className="flex flex-col items-center py-1 px-3 transition-all">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-1 transition-all ${pathname === "/" ? "bg-white bg-opacity-20" : "hover:bg-white hover:bg-opacity-10"}`}>
              <Home className="w-6 h-6 text-slate-900" />
            </div>
            <span className={`text-xs font-medium ${pathname === "/" ? "text-white" : "text-slate-900"}`}>Home</span>
          </Link>

          {/* Riwayat Tab */}
          <Link href="/history" className="flex flex-col items-center py-1 px-3 transition-all">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-1 transition-all ${pathname === "/history" ? "bg-white bg-opacity-20" : "hover:bg-white hover:bg-opacity-10"}`}>
              <ClipboardClock className="w-6 h-6 text-slate-900" />
            </div>
            <span className={`text-xs font-medium ${pathname === "/riwayat" ? "text-white" : "text-slate-900"}`}>Riwayat</span>
          </Link>

          {/* Profile Tab */}
          <Link href={profileHref} className="flex flex-col items-center py-1 px-3 transition-all">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-1 transition-all ${profileActive ? "bg-white bg-opacity-20" : "hover:bg-white hover:bg-opacity-10"}`}>
              <User className="w-6 h-6 text-slate-900" />
            </div>
            <span className={`text-xs font-medium ${profileActive ? "text-white" : "text-slate-900"}`}>Profile</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
