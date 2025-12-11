"use client";

import Navbar from "@/components/Navbar";
import Header from "@/components/Header";
import Clock from "@/components/Clock";
import Permission from "@/components/Permission";
import dynamic from "next/dynamic";

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
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <Header />
      {/* Main Content */}
      <div className="flex-1 px-4 py-4 md:px-6 lg:px-8 pb-24">
        <div className="max-w-md mx-auto space-y-4">
          {/* Clock Card */}
          <Clock />

          {/* Keterangan Izin */}
          <Permission />

          {/* Map Placeholder */}
          <div className="rounded-lg overflow-hidden border mb-4">
            <Maps height="200px" />
          </div>
        </div>
      </div>
      {/* Bottom Navigation */}
      <Navbar />
    </div>
  );
}
