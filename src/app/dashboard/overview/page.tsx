"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, Users, TrendingUp, Activity, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import Sidebar from "@/components/Sidebar";

interface Stats {
  totalEmployees: number;
  presentToday: number;
  lateToday: number;
  absentToday: number;
  attendanceRate: number;
}

interface RecentActivity {
  id: string;
  employee: string;
  action: string;
  time: string;
  status: string;
}

interface AdminData {
  stats: Stats;
  recentActivities: RecentActivity[];
}

function StatsCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-1" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}

function ActivitySkeleton() {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-4 rounded-full" />
        <div>
          <Skeleton className="h-4 w-24 mb-1" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-3 w-12" />
    </div>
  );
}

function ProgressBarSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i}>
          <div className="flex justify-between mb-1">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-3 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

export default function OverviewPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/admin/attendance");
        const result = await response.json();

        if (response.ok) {
          setData({
            stats: result.data.stats,
            recentActivities: result.data.recentActivities || [],
          });
        } else {
          setError(result.message || "Gagal mengambil data");
        }
      } catch (err) {
        setError("Terjadi kesalahan saat mengambil data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const stats = data?.stats || {
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    attendanceRate: 0,
  };

  const recentActivities = data?.recentActivities || [];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Ringkasan Kehadiran</h1>
              <p className="text-gray-600 mt-1">Pantau cepat kehadiran peserta magang</p>
            </div>
            <div className="text-sm text-gray-500">
              {loading ? (
                <Skeleton className="h-4 w-32" />
              ) : (
                `Terakhir diperbarui: ${new Date().toLocaleString("id-ID")}`
              )}
            </div>
          </div>

          {/* Error State */}
          {error && (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-6">
                <p className="text-red-700">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* STAT */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading ? (
              <>
                <StatsCardSkeleton />
                <StatsCardSkeleton />
                <StatsCardSkeleton />
                <StatsCardSkeleton />
              </>
            ) : (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Karyawan</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalEmployees}</div>
                    <p className="text-xs text-muted-foreground">Karyawan aktif</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Hadir Hari Ini</CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{stats.presentToday}</div>
                    <p className="text-xs text-muted-foreground">{stats.attendanceRate}% tingkat kehadiran</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tidak Hadir</CardTitle>
                    <XCircle className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{stats.absentToday}</div>
                    <p className="text-xs text-muted-foreground">Karyawan tidak hadir</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Terlambat</CardTitle>
                    <TrendingUp className="h-4 w-4 text-yellow-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">{stats.lateToday}</div>
                    <p className="text-xs text-muted-foreground">Karyawan terlambat hari ini</p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* RINGKASAN DAN AKTIVITAS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/*  RINGKASAN ABSENSI */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Ringkasan Kehadiran
                </CardTitle>
                <CardDescription>Statistik kehadiran hari ini</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <ProgressBarSkeleton />
                ) : (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Hadir</span>
                        <span className="text-green-600">{stats.presentToday} orang</span>
                      </div>
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all duration-500"
                          style={{ width: `${stats.totalEmployees > 0 ? (stats.presentToday / stats.totalEmployees) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Tidak Hadir</span>
                        <span className="text-red-600">{stats.absentToday} orang</span>
                      </div>
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full transition-all duration-500"
                          style={{ width: `${stats.totalEmployees > 0 ? (stats.absentToday / stats.totalEmployees) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Terlambat</span>
                        <span className="text-yellow-600">{stats.lateToday} orang</span>
                      </div>
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                          style={{ width: `${stats.totalEmployees > 0 ? (stats.lateToday / stats.totalEmployees) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AKTIVITAS TERBARU */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Aktivitas Terbaru
                </CardTitle>
                <CardDescription>Aktivitas kehadiran terbaru</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loading ? (
                    <>
                      <ActivitySkeleton />
                      <ActivitySkeleton />
                      <ActivitySkeleton />
                      <ActivitySkeleton />
                    </>
                  ) : recentActivities.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Belum ada aktivitas hari ini</p>
                    </div>
                  ) : (
                    recentActivities.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {activity.status === "success" && <CheckCircle className="h-4 w-4 text-green-600" />}
                          {activity.status === "warning" && <AlertCircle className="h-4 w-4 text-yellow-600" />}
                          {activity.status === "error" && <XCircle className="h-4 w-4 text-red-600" />}
                          <div>
                            <p className="text-sm font-medium">{activity.employee}</p>
                            <p className="text-xs text-gray-500">{activity.action}</p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500">{activity.time}</span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
