"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, MapPin, CheckCircle, XCircle, AlertTriangle, Users, Filter, FileText, PlusCircle, Loader2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast as sonnerToast } from "sonner";

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
  permissionToday: number;
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
      <td className="py-3 px-4 text-right">
        <Skeleton className="h-8 w-16 ml-auto rounded" />
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

  // State untuk Manual Attendance Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("attendance");
  const [formData, setFormData] = useState({
    userId: "",
    date: new Date().toISOString().split("T")[0],
    checkInTime: "08:00",
    checkOutTime: "16:00",
    notes: "",
    permissionType: "izin"
  });

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

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

  const handleManualSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    try {
      // Create full ISO strings for times
      const checkInISO = activeTab === "attendance"
        ? new Date(`${formData.date}T${formData.checkInTime}:00`).toISOString()
        : null;
      const checkOutISO = activeTab === "attendance" && formData.checkOutTime
        ? new Date(`${formData.date}T${formData.checkOutTime}:00`).toISOString()
        : null;

      const response = await fetch("/api/admin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          actionType: activeTab,
          checkInTime: checkInISO,
          checkOutTime: checkOutISO,
          permissionType: activeTab === "permission" ? formData.permissionType : null
        }),
      });

      const result = await response.json();

      if (response.ok) {
        sonnerToast.success(result.message || "Berhasil menyimpan data");
        setIsModalOpen(false);
        fetchData();
        setFormData({
          userId: "",
          date: new Date().toISOString().split("T")[0],
          checkInTime: "08:00",
          checkOutTime: "16:00",
          notes: "",
          permissionType: "izin"
        });
      } else {
        sonnerToast.error(result.message || "Gagal menyimpan data");
      }
    } catch (err) {
      console.error(err);
      sonnerToast.error("Terjadi kesalahan sistem");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAction = (userId: string, action: "attendance" | "permission") => {
    setFormData(prev => ({
      ...prev,
      userId: userId,
      date: selectedDate,
      checkInTime: "08:00",
      checkOutTime: "16:00",
      notes: ""
    }));

    setActiveTab(action);
    setIsModalOpen(true);
  };

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

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold flex items-center gap-2">
                  <PlusCircle className="h-5 w-5" />
                  Input Data Manual
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] bg-white p-0 overflow-hidden border-none shadow-2xl">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid grid-cols-2 w-full h-14 rounded-none bg-gray-100 p-1">
                    <TabsTrigger value="attendance" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-none">Presensi</TabsTrigger>
                    <TabsTrigger value="permission" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-none">Izin / Sakit</TabsTrigger>
                  </TabsList>

                  <div className="p-6">
                    <DialogHeader className="mb-4">
                      <DialogTitle className="text-xl">
                        {activeTab === "attendance" ? "Absensi Manual" : "Input Izin / Permit"}
                      </DialogTitle>
                      <DialogDescription>
                        {activeTab === "attendance"
                          ? "Isi jam masuk/pulang untuk peserta yang lupa melakukan scan."
                          : "Catat keterangan izin, sakit, atau libur untuk peserta."}
                      </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleManualSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="userId">Pilih Pemagang</Label>
                        <Select
                          value={formData.userId}
                          onValueChange={(val) => setFormData({ ...formData, userId: val })}
                        >
                          <SelectTrigger className="w-full border-gray-200">
                            <SelectValue placeholder="Pilih pemagang..." />
                          </SelectTrigger>
                          <SelectContent className="bg-white border shadow-md">
                            {allEmployees.map((emp) => (
                              <SelectItem key={emp.id} value={emp.userId || emp.id}>
                                {emp.employee} {emp.status === 'absent' ? '(Belum Ada Data)' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="manual-date">Tanggal</Label>
                        <Input
                          id="manual-date"
                          type="date"
                          className="border-gray-200"
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        />
                      </div>

                      {activeTab === "attendance" ? (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                          <div className="space-y-2">
                            <Label htmlFor="checkIn">Jam Masuk</Label>
                            <Input
                              id="checkIn"
                              type="time"
                              className="border-gray-200"
                              value={formData.checkInTime}
                              onChange={(e) => setFormData({ ...formData, checkInTime: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="checkOut">Jam Pulang</Label>
                            <Input
                              id="checkOut"
                              type="time"
                              className="border-gray-200"
                              value={formData.checkOutTime}
                              onChange={(e) => setFormData({ ...formData, checkOutTime: e.target.value })}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                          <Label htmlFor="permissionType">Keterangan</Label>
                          <Select
                            value={formData.permissionType}
                            onValueChange={(val) => setFormData({ ...formData, permissionType: val })}
                          >
                            <SelectTrigger className="w-full border-gray-200">
                              <SelectValue placeholder="Pilih jenis izin..." />
                            </SelectTrigger>
                            <SelectContent className="bg-white border shadow-md">
                              <SelectItem value="izin">Izin</SelectItem>
                              <SelectItem value="sakit">Sakit</SelectItem>
                              <SelectItem value="libur">Libur / Cuti</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="manual-notes">Catatan Tambahan</Label>
                        <Input
                          id="manual-notes"
                          className="border-gray-200"
                          placeholder={activeTab === 'attendance' ? "Contoh: Lupa scan" : "Contoh: Ada urusan keluarga"}
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                      </div>

                      <DialogFooter className="pt-4">
                        <Button
                          type="submit"
                          disabled={isSubmitting || !formData.userId}
                          className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold h-11"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Memproses...
                            </>
                          ) : "Simpan Perubahan"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </div>
                </Tabs>
              </DialogContent>
            </Dialog>
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
                  <label htmlFor="date-filter" className="sr-only">Pilih Tanggal</label>
                  <input
                    id="date-filter"
                    type="date"
                    value={selectedDate}
                    title="Pilih Tanggal"
                    placeholder="Pilih Tanggal"
                    aria-label="Pilih Tanggal"
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {loading ? (
              <>
                <StatsCardSkeleton />
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
                          <p className="text-sm font-medium text-gray-600">Izin</p>
                          <p className="text-2xl font-bold text-blue-600">{data.stats.permissionToday}</p>
                        </div>
                        <FileText className="h-8 w-8 text-blue-600" />
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
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Aksi</th>
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
                        <td colSpan={7} className="text-center py-8 text-gray-500">
                          <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>Belum ada data kehadiran untuk tanggal ini</p>
                        </td>
                      </tr>
                    ) : (
                      allEmployees.map((employee) => (
                        <tr key={employee.id} className="border-b border-gray-100 hover:bg-gray-50 group">
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
                              <span className="text-gray-600 text-sm whitespace-nowrap">{employee.location || "N/A"}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {employee.status === 'absent' ? (
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs border-green-200 text-green-700 hover:bg-green-50"
                                  onClick={() => handleQuickAction(employee.userId, 'attendance')}
                                >
                                  Hadir
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                                  onClick={() => handleQuickAction(employee.userId, 'permission')}
                                >
                                  Izin
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs text-gray-400"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, userId: employee.userId }));
                                  setIsModalOpen(true);
                                }}
                              >
                                Edit
                              </Button>
                            )}
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
