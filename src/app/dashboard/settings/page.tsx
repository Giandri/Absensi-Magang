"use client";

import React, { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Settings, Save, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface UserPermission {
  id: string;
  name: string | null;
  email: string;
  canManualAttendance: boolean;
}

export default function SettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  const [allowManualAttendance, setAllowManualAttendance] = useState(false);
  const [users, setUsers] = useState<UserPermission[]>([]);
  const [search, setSearch] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [savingGlobal, setSavingGlobal] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/settings");
      const json = await res.json();
      if (json.success && json.data) {
        setAllowManualAttendance(json.data.allowManualAttendance);
        setUsers(json.data.users);
      }
    } catch (error) {
      toast.error("Gagal mengambil pengaturan");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGlobalToggle = async (value: boolean) => {
    setAllowManualAttendance(value);
    setSavingGlobal(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowManualAttendance: value }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
      } else {
        setAllowManualAttendance(!value);
        toast.error(json.message || "Gagal menyimpan");
      }
    } catch {
      setAllowManualAttendance(!value);
      toast.error("Terjadi kesalahan");
    } finally {
      setSavingGlobal(false);
    }
  };

  const handleUserToggle = async (userId: string, newValue: boolean) => {
    setTogglingId(userId);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, canManualAttendance: newValue }),
      });
      const json = await res.json();
      if (json.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, canManualAttendance: newValue } : u))
        );
        toast.success(json.message);
      } else {
        toast.error(json.message || "Gagal mengubah izin");
      }
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setTogglingId(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      (u.name || "").toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-xl">
                <Settings className="w-7 h-7 text-yellow-600" />
              </div>
              Pengaturan Sistem
            </h1>
            <p className="text-gray-500 mt-2">Kelola pengaturan aplikasi absensi</p>
          </div>

          {/* Card 1: Global Toggle */}
          <Card>
            <CardHeader>
              <CardTitle>Fitur Karyawan</CardTitle>
              <CardDescription>Aktifkan atau nonaktifkan fitur untuk karyawan</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-16 w-full rounded-lg" />
              ) : (
                <div className="flex items-center justify-between p-4 bg-white rounded-xl border">
                  <div className="space-y-0.5">
                    <Label className="text-base font-semibold">Tombol Absen Manual</Label>
                    <p className="text-sm text-gray-500">
                      Izinkan fitur absen manual ditampilkan di beranda karyawan.
                    </p>
                  </div>
                  <Switch
                    checked={allowManualAttendance}
                    disabled={savingGlobal}
                    onCheckedChange={handleGlobalToggle}
                    className="data-[state=checked]:bg-yellow-500"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Per-User Permissions — Animated slide */}
          <div
            style={{
              display: "grid",
              gridTemplateRows: allowManualAttendance ? "1fr" : "0fr",
              transition: "grid-template-rows 500ms ease-in-out",
            }}
          >
            <div style={{ overflow: "hidden" }}>
              <div style={{ 
                opacity: allowManualAttendance ? 1 : 0,
                transform: allowManualAttendance ? "translateY(0)" : "translateY(-12px)",
                transition: "opacity 400ms ease-in-out, transform 400ms ease-in-out",
                transitionDelay: allowManualAttendance ? "150ms" : "0ms",
              }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  Izin Absen Manual Per Karyawan
                </CardTitle>
                <CardDescription>
                  Pilih karyawan mana saja yang diizinkan menggunakan fitur absen manual
                </CardDescription>
                <div className="pt-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Cari nama atau email..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-10 h-10 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-48" />
                          </div>
                        </div>
                        <Skeleton className="h-6 w-11 rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Search className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">
                      {search ? "Tidak ada karyawan ditemukan" : "Belum ada karyawan terdaftar"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                          user.canManualAttendance
                            ? "bg-green-50/50 border-green-200"
                            : "bg-white border-gray-100 hover:border-gray-200"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                              user.canManualAttendance
                                ? "bg-green-500 text-white"
                                : "bg-yellow-400 text-black"
                            }`}
                          >
                            {(user.name || user.email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900 text-sm">
                                {user.name || "Nama belum diisi"}
                              </p>
                              {user.canManualAttendance && (
                                <Badge className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0 hover:bg-green-100">
                                  Diizinkan
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                        <Switch
                          checked={user.canManualAttendance}
                          disabled={togglingId === user.id}
                          onCheckedChange={(checked) => handleUserToggle(user.id, checked)}
                          className="data-[state=checked]:bg-green-500"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
