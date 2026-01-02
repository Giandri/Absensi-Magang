"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, MapPin, CheckCircle, XCircle, AlertTriangle, Users, Filter, Download } from "lucide-react";
import Sidebar from "@/components/Sidebar";

interface AttendanceRecord {
  id: string;
  employee: string;
  email: string;
  userId: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  location: string;
  workHours: string;
  notes: string;
}

interface AbsentUser {
  id: string;
  employee: string;
  email: string;
  status: string;
  permissionType?: string | null;
  permissionNote?: string | null;
  permissionStatus?: string | null;
}

interface Stats {
  totalEmployees: number;
  presentToday: number;
  lateToday: number;
  absentToday: number;
  attendanceRate: number;
}

interface AdminAttendanceData {
  date: string;
  attendance: AttendanceRecord[];
  absentUsers: AbsentUser[];
  stats: Stats;
}

// Skeleton untuk Stats Card
function StatsCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-12" />
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

// Skeleton untuk Table Row
function TableRowSkeleton() {
  return (
    <tr className="border-b border-gray-100">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-full" />
          <div>
            <Skeleton className="h-4 w-28 mb-1" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        <Skeleton className="h-4 w-16" />
      </td>
      <td className="py-3 px-4">
        <Skeleton className="h-4 w-16" />
      </td>
      <td className="py-3 px-4">
        <Skeleton className="h-6 w-16 rounded-full" />
      </td>
      <td className="py-3 px-4">
        <Skeleton className="h-4 w-20" />
      </td>
      <td className="py-3 px-4">
        <Skeleton className="h-4 w-32" />
      </td>
    </tr>
  );
}

export default function AttendanceMonitoringPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<AdminAttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/attendance?date=${selectedDate}`);
        const result = await response.json();

        if (response.ok) {
          setData(result.data);
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
  }, [selectedDate]);

  const getStatusBadge = (status: string, permissionType?: string | null) => {
    switch (status) {
      case "present":
        return <Badge className="bg-green-100 text-green-800">Hadir</Badge>;
      case "late":
        return <Badge className="bg-yellow-100 text-yellow-800">Terlambat</Badge>;
      case "absent":
        return <Badge className="bg-red-100 text-red-800">Tidak Hadir</Badge>;
      case "permission":
        return <Badge className="bg-blue-100 text-blue-800">{permissionType || "Izin"}</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const allEmployees = data
    ? [
        ...data.attendance.map((a) => ({ ...a, permissionType: null as string | null })),
        ...data.absentUsers.map((u) => ({
          id: u.id,
          employee: u.employee,
          email: u.email,
          userId: u.id,
          checkIn: null,
          checkOut: null,
          status: u.status,
          location: "N/A",
          workHours: "0j 0m",
          notes: "",
          permissionType: u.permissionType || null,
        })),
      ]
    : [];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Monitoring Kehadiran</h1>
              <p className="text-gray-600 mt-1">Pelacakan dan monitoring kehadiran peserta magang</p>
            </div>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filter
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error State */}
          {error && (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-6">
                <p className="text-red-700">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Summary Stats - Skeleton atau Data */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {loading ? (
              <>
                <StatsCardSkeleton />
                <StatsCardSkeleton />
                <StatsCardSkeleton />
                <StatsCardSkeleton />
              </>
            ) : (
              data && (
                <>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Pemagang</p>
                          <p className="text-2xl font-bold">{data.stats.totalEmployees}</p>
                        </div>
                        <Users className="h-8 w-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Hadir Hari Ini</p>
                          <p className="text-2xl font-bold text-green-600">{data.stats.presentToday}</p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Terlambat</p>
                          <p className="text-2xl font-bold text-yellow-600">{data.stats.lateToday}</p>
                        </div>
                        <AlertTriangle className="h-8 w-8 text-yellow-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Tidak Hadir</p>
                          <p className="text-2xl font-bold text-red-600">{data.stats.absentToday}</p>
                        </div>
                        <XCircle className="h-8 w-8 text-red-600" />
                      </div>
                    </CardContent>
                  </Card>
                </>
              )
            )}
          </div>

          {/* Attendance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Kehadiran Hari Ini</CardTitle>
              <CardDescription>Data kehadiran untuk {new Date(selectedDate).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Karyawan</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Masuk</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Keluar</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Jam Kerja</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Lokasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <>
                        <TableRowSkeleton />
                        <TableRowSkeleton />
                        <TableRowSkeleton />
                        <TableRowSkeleton />
                        <TableRowSkeleton />
                      </>
                    ) : allEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-gray-500">
                          <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>Belum ada data kehadiran untuk tanggal ini</p>
                        </td>
                      </tr>
                    ) : (
                      allEmployees.map((employee) => (
                        <tr key={employee.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-sm font-medium text-black">
                                {employee.employee
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2)}
                              </div>
                              <div>
                                <span className="font-medium block">{employee.employee}</span>
                                <span className="text-xs text-gray-500">{employee.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <span className={employee.checkIn ? "text-gray-900" : "text-gray-400"}>{employee.checkIn || "Belum absen"}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <span className={employee.checkOut ? "text-gray-900" : "text-gray-400"}>{employee.checkOut || "Belum pulang"}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">{getStatusBadge(employee.status, employee.permissionType)}</td>
                          <td className="py-3 px-4 text-gray-900">{employee.workHours}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-600 text-sm">{employee.location || "N/A"}</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
