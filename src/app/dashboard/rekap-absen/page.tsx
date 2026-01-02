"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Download, Users, FileSpreadsheet, ChevronDown, ChevronUp, Clock, CheckCircle, XCircle, AlertTriangle, FileText } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface UserSummary {
  userId: string;
  name: string;
  email: string;
  present: number;
  late: number;
  permission: number;
  absent: number;
  holiday: number;
  weekend: number;
  totalWorkHours: string;
}

interface DetailRecord {
  userId: string;
  name: string;
  email: string;
  date: string;
  status: string;
  checkIn: string | null;
  checkOut: string | null;
  workHours: string;
  permissionType: string | null;
  permissionStatus: string | null;
  notes: string;
  dayType: "holiday" | "weekend" | "workday";
  holidayName: string | null;
}

interface RekapData {
  summary: UserSummary[];
  detail: DetailRecord[];
  dateRange: { start: string; end: string };
  totalDays: number;
}

type PeriodType = "daily" | "weekly" | "monthly";

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex gap-4 p-3 bg-gray-50 rounded-lg">
          <Skeleton className="h-6 flex-1" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  );
}

export default function RekapAbsenPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [data, setData] = useState<RekapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [periodType, setPeriodType] = useState<PeriodType>("daily");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  // Date range
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  // Update date range based on period type
  useEffect(() => {
    const today = new Date();
    let start: Date, end: Date;

    switch (periodType) {
      case "daily":
        start = today;
        end = today;
        break;
      case "weekly":
        const dayOfWeek = today.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        start = new Date(today);
        start.setDate(today.getDate() + diffToMonday);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        break;
      case "monthly":
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
    }

    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  }, [periodType]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        start: startDate,
        end: endDate,
        ...(selectedUserId && { userId: selectedUserId }),
      });

      const response = await fetch(`/api/admin/attendance/rekap?${params}`);
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

  useEffect(() => {
    if (startDate && endDate) {
      fetchData();
    }
  }, [startDate, endDate, selectedUserId]);

  const handleExportCSV = () => {
    const params = new URLSearchParams({
      start: startDate,
      end: endDate,
      format: "csv",
      ...(selectedUserId && { userId: selectedUserId }),
    });
    window.open(`/api/admin/attendance/rekap?${params}`, "_blank");
  };

  const handleExportPDF = () => {
    if (!data) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("REKAP ABSENSI", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const periodText = `Periode: ${new Date(startDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} - ${new Date(endDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`;
    doc.text(periodText, pageWidth / 2, 28, { align: "center" });

    // Summary Table
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Ringkasan Per Karyawan", 14, 40);

    const summaryData = data.summary.map((user) => [
      user.name,
      user.present.toString(),
      user.late.toString(),
      user.permission.toString(),
      user.absent.toString(),
      user.holiday.toString(),
      user.weekend.toString(),
      user.totalWorkHours,
    ]);

    autoTable(doc, {
      startY: 45,
      head: [["Nama", "Hadir", "Terlambat", "Izin", "Absen", "Libur", "Weekend", "Total Jam"]],
      body: summaryData,
      theme: "grid",
      headStyles: { fillColor: [250, 204, 21], textColor: [0, 0, 0], fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 18, halign: "center" },
        2: { cellWidth: 22, halign: "center" },
        3: { cellWidth: 18, halign: "center" },
        4: { cellWidth: 18, halign: "center" },
        5: { cellWidth: 18, halign: "center" },
        6: { cellWidth: 20, halign: "center" },
        7: { cellWidth: 22, halign: "center" },
      },
    });

    // Detail per user
    let currentY = (doc as any).lastAutoTable.finalY + 15;

    data.summary.forEach((user) => {
      const userDetails = data.detail.filter((d) => d.userId === user.userId);

      // Check if need new page
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`Detail: ${user.name}`, 14, currentY);

      const detailData = userDetails.map((detail) => {
        let statusText = detail.status;
        if (detail.status === "present") statusText = "Hadir";
        else if (detail.status === "late") statusText = "Terlambat";
        else if (detail.status === "absent") statusText = "Tidak Hadir";
        else if (detail.status === "permission") statusText = detail.permissionType || "Izin";
        else if (detail.status === "holiday") statusText = "Libur";
        else if (detail.status === "weekend") statusText = detail.holidayName || "Weekend";

        let permStatusText = "-";
        if (detail.permissionStatus === "approved") permStatusText = "Disetujui";
        else if (detail.permissionStatus === "pending") permStatusText = "Menunggu";
        else if (detail.permissionStatus === "rejected") permStatusText = "Ditolak";

        const notesText = detail.status === "holiday" && detail.holidayName ? detail.holidayName : (detail.notes || "-");

        return [
          new Date(detail.date).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" }),
          statusText,
          permStatusText,
          detail.checkIn || "-",
          detail.checkOut || "-",
          detail.status === "holiday" || detail.status === "weekend" ? "-" : detail.workHours,
          notesText,
        ];
      });

      autoTable(doc, {
        startY: currentY + 5,
        head: [["Tanggal", "Status", "Status Izin", "Masuk", "Pulang", "Jam Kerja", "Catatan"]],
        body: detailData,
        theme: "striped",
        headStyles: { fillColor: [100, 116, 139], textColor: [255, 255, 255], fontStyle: "bold" },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 28 },
          1: { cellWidth: 22 },
          2: { cellWidth: 22 },
          3: { cellWidth: 18, halign: "center" },
          4: { cellWidth: 18, halign: "center" },
          5: { cellWidth: 20, halign: "center" },
          6: { cellWidth: 47 },
        },
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Halaman ${i} dari ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
      doc.text(`Dicetak: ${new Date().toLocaleString("id-ID")}`, 14, doc.internal.pageSize.getHeight() - 10);
    }

    doc.save(`rekap-absen-${startDate}-${endDate}.pdf`);
  };

  const toggleUserExpand = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const getStatusBadge = (status: string, permissionType?: string | null, holidayName?: string | null) => {
    switch (status) {
      case "present":
        return <Badge className="bg-green-100 text-green-800">Hadir</Badge>;
      case "late":
        return <Badge className="bg-yellow-100 text-yellow-800">Terlambat</Badge>;
      case "absent":
        return <Badge className="bg-red-100 text-red-800">Tidak Hadir</Badge>;
      case "permission":
        return <Badge className="bg-blue-100 text-blue-800">{permissionType || "Izin"}</Badge>;
      case "holiday":
        return <Badge className="bg-purple-100 text-purple-800">🎉 Libur</Badge>;
      case "weekend":
        return <Badge className="bg-gray-200 text-gray-700">{holidayName || "Akhir Pekan"}</Badge>;
      default:
        return <Badge variant="secondary">-</Badge>;
    }
  };

  const getPermissionStatusBadge = (permissionStatus: string | null) => {
    switch (permissionStatus) {
      case "approved":
        return <Badge className="bg-green-100 text-green-800">Disetujui</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Menunggu</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Ditolak</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Rekap Absensi</h1>
              <p className="text-gray-600 mt-1">Rekap kehadiran harian, mingguan, dan bulanan</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleExportPDF} disabled={!data || loading} className="bg-red-600 hover:bg-red-700">
                <FileText className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button onClick={handleExportCSV} disabled={!data || loading} className="bg-green-600 hover:bg-green-700">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Filter Periode
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 items-end">
                {/* Period Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Periode</label>
                  <div className="flex gap-2">
                    {(["daily", "weekly", "monthly"] as PeriodType[]).map((type) => (
                      <Button
                        key={type}
                        variant={periodType === type ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPeriodType(type)}
                        className={periodType === type ? "bg-yellow-400 hover:bg-yellow-500 text-black" : ""}
                      >
                        {type === "daily" ? "Harian" : type === "weekly" ? "Mingguan" : "Bulanan"}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                {/* Refresh Button */}
                <Button onClick={fetchData} disabled={loading} variant="outline">
                  {loading ? "Memuat..." : "Refresh"}
                </Button>
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

          {/* Summary Stats */}
          {data && !loading && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Karyawan</p>
                      <p className="text-xl font-bold">{data.summary.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Hadir</p>
                      <p className="text-xl font-bold text-green-600">{data.summary.reduce((sum, u) => sum + u.present, 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Terlambat</p>
                      <p className="text-xl font-bold text-yellow-600">{data.summary.reduce((sum, u) => sum + u.late, 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <XCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Tidak Hadir</p>
                      <p className="text-xl font-bold text-red-600">{data.summary.reduce((sum, u) => sum + u.absent, 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Summary Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Rekap Per Karyawan
              </CardTitle>
              <CardDescription>
                Periode: {new Date(startDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} -{" "}
                {new Date(endDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                {data && ` (${data.totalDays} hari)`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <TableSkeleton />
              ) : !data || data.summary.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Tidak ada data untuk periode ini</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.summary.map((user) => {
                    const isExpanded = expandedUsers.has(user.userId);
                    const userDetails = data.detail.filter((d) => d.userId === user.userId);

                    return (
                      <div key={user.userId} className="border rounded-lg overflow-hidden">
                        {/* User Summary Row */}
                        <div
                          className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition"
                          onClick={() => toggleUserExpand(user.userId)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-sm font-medium text-black">
                              {user.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </div>
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <p className="text-xs text-gray-500">Hadir</p>
                              <p className="font-bold text-green-600">{user.present}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-gray-500">Terlambat</p>
                              <p className="font-bold text-yellow-600">{user.late}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-gray-500">Izin</p>
                              <p className="font-bold text-blue-600">{user.permission}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-gray-500">Absen</p>
                              <p className="font-bold text-red-600">{user.absent}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-gray-500">Libur</p>
                              <p className="font-bold text-purple-600">{user.holiday}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-gray-500">Weekend</p>
                              <p className="font-bold text-gray-500">{user.weekend}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-gray-500">Total Jam</p>
                              <p className="font-bold text-gray-700">{user.totalWorkHours}</p>
                            </div>
                            <div>{isExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}</div>
                          </div>
                        </div>

                        {/* User Detail Table */}
                        {isExpanded && (
                          <div className="p-4 bg-white border-t">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left py-2 px-3 font-medium text-gray-600">Tanggal</th>
                                  <th className="text-left py-2 px-3 font-medium text-gray-600">Status</th>
                                  <th className="text-left py-2 px-3 font-medium text-gray-600">Status Izin</th>
                                  <th className="text-left py-2 px-3 font-medium text-gray-600">Masuk</th>
                                  <th className="text-left py-2 px-3 font-medium text-gray-600">Pulang</th>
                                  <th className="text-left py-2 px-3 font-medium text-gray-600">Jam Kerja</th>
                                  <th className="text-left py-2 px-3 font-medium text-gray-600">Catatan</th>
                                </tr>
                              </thead>
                              <tbody>
                                {userDetails.map((detail, idx) => (
                                  <tr key={idx} className={`border-b border-gray-100 hover:bg-gray-50 ${detail.dayType === "holiday" ? "bg-purple-50" : detail.dayType === "weekend" ? "bg-gray-50" : ""}`}>
                                    <td className="py-2 px-3">{formatDate(detail.date)}</td>
                                    <td className="py-2 px-3">{getStatusBadge(detail.status, detail.permissionType, detail.holidayName)}</td>
                                    <td className="py-2 px-3">{getPermissionStatusBadge(detail.permissionStatus) || "-"}</td>
                                    <td className="py-2 px-3">
                                      <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3 text-gray-400" />
                                        <span className={detail.checkIn ? "" : "text-gray-400"}>{detail.checkIn || "-"}</span>
                                      </div>
                                    </td>
                                    <td className="py-2 px-3">
                                      <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3 text-gray-400" />
                                        <span className={detail.checkOut ? "" : "text-gray-400"}>{detail.checkOut || "-"}</span>
                                      </div>
                                    </td>
                                    <td className="py-2 px-3">{detail.status === "holiday" || detail.status === "weekend" ? "-" : detail.workHours}</td>
                                    <td className="py-2 px-3 text-gray-600">
                                      {detail.status === "holiday" && detail.holidayName ? (
                                        <span className="text-purple-600 font-medium">{detail.holidayName}</span>
                                      ) : detail.notes || "-"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

