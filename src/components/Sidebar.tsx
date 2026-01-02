"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, BarChart3, Activity, LogOut, Users, FileSpreadsheet } from "lucide-react";
import Image from "next/image";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const menuItems = [
    {
      href: "/dashboard/overview",
      icon: BarChart3,
      label: "Ringkasan",
      isActive: pathname === "/dashboard/overview",
    },
    {
      href: "/dashboard/attendance-monitoring",
      icon: Activity,
      label: "Monitoring Kehadiran",
      isActive: pathname === "/dashboard/attendance-monitoring",
    },
    {
      href: "/dashboard/rekap-absen",
      icon: FileSpreadsheet,
      label: "Rekap Absensi",
      isActive: pathname === "/dashboard/rekap-absen",
    },
    {
      href: "/dashboard/employees",
      icon: Users,
      label: "Hubungi Peserta",
      isActive: pathname === "/dashboard/employees",
    },
  ];

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth-token");
      localStorage.removeItem("user-data");
    }
    router.push("/login");
  };

  return (
    <div className={`${isOpen ? "w-64" : "w-20"} bg-white m-4 rounded-2xl shadow-sm p-6 flex flex-col transition-all duration-300 relative`}>
      {/* Toggle Button */}
      <Button variant="outline" size="icon" className="absolute -right-3 top-8 bg-white border-gray-200 rounded-full w-6 h-6 p-0 shadow-md z-10" onClick={onToggle}>
        {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </Button>

      {/* Logo */}
      <div className={`flex items-center gap-2 mb-8 ${!isOpen && "justify-center"}`}>
        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
          <Image src="/images/BWS.png" alt="Logo" width={60} height={60} />
        </div>
        {isOpen && <span className="text-xl font-bold whitespace-nowrap">MAGANG BWS</span>}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Button
              variant={item.isActive ? "default" : "ghost"}
              className={`w-full ${isOpen ? "justify-start" : "justify-center"} gap-3 ${item.isActive ? "bg-yellow-400 hover:bg-yellow-500 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"}`}>
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {isOpen && <span className="font-medium">{item.label}</span>}
            </Button>
          </Link>
        ))}
      </nav>

      {/* Logout Button */}
      <div className="mt-auto pt-4 border-t border-gray-200">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={`w-full ${isOpen ? "justify-start" : "justify-center"} gap-3 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors`}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {isOpen && <span className="font-medium">Keluar</span>}
        </Button>
      </div>
    </div>
  );
}
