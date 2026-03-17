"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Download, Users, FileSpreadsheet, ChevronDown, ChevronUp, Clock, CheckCircle, XCircle, AlertTriangle, FileText, User, Search, UserCheck, UserX, Filter, Check } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import Sidebar from "@/components/Sidebar";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface JSDocWithAutoTable extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
}

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
  const [employees, setEmployees] = useState<{ id: string, name: string }[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
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
        ...(selectedUserIds.length > 0 && { userId: selectedUserIds.join(",") }),
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

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/admin/employees");
      const result = await response.json();
      if (response.ok) {
        setEmployees(result.data);
      }
    } catch (err) {
      console.error("Failed to fetch employees", err);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchData();
    }
  }, [startDate, endDate, selectedUserIds]);

  const handleExportCSV = () => {
    const params = new URLSearchParams({
      start: startDate,
      end: endDate,
      format: "csv",
      ...(selectedUserIds.length > 0 && { userId: selectedUserIds.join(",") }),
    });
    window.open(`/api/admin/attendance/rekap?${params}`, "_blank");
  };

  const handleExportPDF = () => {
    if (!data) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // -- Brand Colors --
    const PRIMARY_COLOR = [250, 204, 21]; // Yellow 400
    const SECONDARY_COLOR = [241, 245, 249]; // Gray 100
    const TEXT_PRIMARY = [15, 23, 42]; // Slate 900
    const TEXT_SECONDARY = [100, 116, 139]; // Slate 500

    // -- Header Design (Official PU Style - Image) --
    let currentY = 0;
    const MARGIN = 14;
    const USABLE_WIDTH = pageWidth - (MARGIN * 2);

    try {
      // Compact kop surat - aligned with table margins (14mm)
      const kopHeight = 22;
      doc.addImage("/images/kopsurat.png", "PNG", MARGIN, 5, USABLE_WIDTH, kopHeight);
      currentY = 32;
    } catch (e) {
      console.error("Failed to load kopsurat image", e);
      currentY = 15;
    }

    // -- Report Title Section --
    doc.setTextColor(15, 23, 42); // Dark Slate
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("LAPORAN REKAP ABSENSI PESERTA MAGANG", pageWidth / 2, currentY + 10, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const dateRangeText = `Periode: ${new Date(startDate).toLocaleDateString("id-ID", { day: "numeric", month: "long" })} - ${new Date(endDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`;
    doc.text(dateRangeText, pageWidth / 2, currentY + 17, { align: "center" });

    // -- Summary Section --
    currentY += 20;

    // Summary Statistics Header Card
    const stats = [
      { label: "Total Peserta", value: data.summary.length.toString(), icon: "users" },
      { label: "Total Hadir", value: data.summary.reduce((sum, u) => sum + u.present, 0).toString(), icon: "check" },
      { label: "Terlambat", value: data.summary.reduce((sum, u) => sum + u.late, 0).toString(), icon: "clock" },
      { label: "Izin", value: data.summary.reduce((sum, u) => sum + u.permission, 0).toString(), icon: "doc" }
    ];

    const cardGap = 4;
    const cardWidth = (USABLE_WIDTH - (cardGap * (stats.length - 1))) / stats.length;
    let statX = MARGIN;

    stats.forEach((stat) => {
      const centerX = statX + (cardWidth / 2);

      // Card Background
      doc.setFillColor(SECONDARY_COLOR[0], SECONDARY_COLOR[1], SECONDARY_COLOR[2]);
      doc.roundedRect(statX, currentY + 7, cardWidth, 26, 3, 3, "F");

      // Muted Icon Color (Slate 400/500)
      const MINT_COLOR = [148, 163, 184];
      doc.setDrawColor(MINT_COLOR[0], MINT_COLOR[1], MINT_COLOR[2]);

      // Draw Simple Icon Centered
      doc.setLineWidth(0.4);
      if (stat.icon === "users") {
        doc.circle(centerX, currentY + 13, 1.3, "D"); // Head
        doc.ellipse(centerX, currentY + 16, 2.2, 1.3, "D"); // Body
      } else if (stat.icon === "check") {
        doc.line(centerX - 2, currentY + 14, centerX - 0.5, currentY + 15.5);
        doc.line(centerX - 0.5, currentY + 15.5, centerX + 2, currentY + 12.5);
      } else if (stat.icon === "clock") {
        doc.circle(centerX, currentY + 14.5, 2.8, "D");
        doc.line(centerX, currentY + 14.5, centerX, currentY + 12.5);
        doc.line(centerX, currentY + 14.5, centerX + 1.8, currentY + 14.5);
      } else if (stat.icon === "doc") {
        doc.rect(centerX - 1.8, currentY + 12.5, 3.6, 4.5, "D");
        doc.line(centerX - 0.8, currentY + 14.5, centerX + 0.8, currentY + 14.5);
        doc.line(centerX - 0.8, currentY + 15.7, centerX + 0.8, currentY + 15.7);
      }

      doc.setFontSize(7.5); // Slightly smaller label
      doc.setTextColor(TEXT_SECONDARY[0], TEXT_SECONDARY[1], TEXT_SECONDARY[2]);
      doc.text(stat.label.toUpperCase(), centerX, currentY + 23, { align: "center" });

      doc.setFontSize(13); // Centered text
      doc.setTextColor(TEXT_PRIMARY[0], TEXT_PRIMARY[1], TEXT_PRIMARY[2]);
      doc.setFont("helvetica", "bold");
      doc.text(stat.value, centerX, currentY + 29, { align: "center" });

      statX += cardWidth + cardGap;
    });

    // Summary Table
    autoTable(doc, {
      startY: currentY + 40,
      head: [["NAMA PESERTA", "HADIR", "TELAT", "IZIN", "ABSEN", "LIBUR"]],
      body: data.summary.map((user) => [
        user.name.toUpperCase(),
        user.present.toString(),
        user.late.toString(),
        user.permission.toString(),
        user.absent.toString(),
        user.holiday.toString()
      ]),
      theme: "grid",
      headStyles: {
        fillColor: [250, 204, 21], // PU Yellow 400
        textColor: [15, 23, 42], // Slate 900
        fontStyle: "bold",
        fontSize: 9,
        halign: "center"
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
        halign: "center",
        lineColor: [226, 232, 240],
        lineWidth: 0.1
      },
      columnStyles: {
        0: { halign: "left", fontStyle: "bold", cellWidth: 80 }
      },
      margin: { left: MARGIN, right: MARGIN },
      didDrawCell: (data) => {
        if (data.section === "body") {
          const val = parseInt(data.cell.raw as string);
          if (val > 0) {
            if (data.column.index === 1) doc.setTextColor(22, 163, 74); // HADIR -> Green
            else if (data.column.index === 2 || data.column.index === 4) doc.setTextColor(220, 38, 38); // TELAT/ABSEN -> Red
          }
        }
      },
    });

    // -- Detail Section --
    data.summary.forEach((user, index) => {
      const userDetails = data.detail.filter((d) => d.userId === user.userId);

      // Force page break for each participant
      doc.addPage();
      currentY = 20;

      // User detail header bar
      doc.setFillColor(SECONDARY_COLOR[0], SECONDARY_COLOR[1], SECONDARY_COLOR[2]);
      doc.rect(MARGIN, currentY, USABLE_WIDTH, 10, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(TEXT_PRIMARY[0], TEXT_PRIMARY[1], TEXT_PRIMARY[2]);
      doc.text(`DAFTAR RINCIAN: ${user.name.toUpperCase()}`, MARGIN + 4, currentY + 6.5);

      const detailData = userDetails.map((detail) => {
        let statusText = detail.status;
        if (detail.status === "present") statusText = "Hadir";
        else if (detail.status === "late") statusText = "Terlambat";
        else if (detail.status === "absent") statusText = "Absen";
        else if (detail.status === "permission") statusText = detail.permissionType || "Izin";
        else if (detail.status === "holiday") statusText = "Libur";
        else if (detail.status === "weekend") statusText = "Akhir Pekan";

        return [
          new Date(detail.date).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" }),
          statusText.toUpperCase(),
          detail.checkIn || "-",
          detail.checkOut || "-",
          detail.notes || "-",
        ];
      });

      autoTable(doc, {
        startY: currentY + 12,
        head: [["TANGGAL", "STATUS", "MASUK", "PULANG", "CATATAN"]],
        body: detailData,
        theme: "striped",
        headStyles: {
          fillColor: [250, 204, 21], // PU Yellow 400
          textColor: [15, 23, 42], // Slate 900
          fontStyle: "bold",
          fontSize: 8
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 2,
          valign: "middle"
        },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 30, fontStyle: "bold" },
          2: { cellWidth: 25, halign: "center" },
          3: { cellWidth: 25, halign: "center" },
          4: { cellWidth: 65, fontSize: 7 }
        },
        margin: { left: MARGIN, right: MARGIN },
        didDrawCell: (data) => {
          // Color coding for status in detail table
          if (data.section === "body" && data.column.index === 1) {
            const val = data.cell.raw as string;
            if (val === "HADIR") {
              doc.setTextColor(22, 163, 74); // Green
            } else if (val === "ABSEN" || val === "TERLAMBAT") {
              doc.setTextColor(220, 38, 38); // Red
            } else {
              doc.setTextColor(TEXT_PRIMARY[0], TEXT_PRIMARY[1], TEXT_PRIMARY[2]);
            }
          }
        }
      });

      currentY = (doc as JSDocWithAutoTable).lastAutoTable.finalY + 15;
    });

    // -- Footer & Page Numbers --
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);

      // Footer Divider
      doc.setDrawColor(226, 232, 240);
      doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);

      doc.setFontSize(8);
      doc.setTextColor(TEXT_SECONDARY[0], TEXT_SECONDARY[1], TEXT_SECONDARY[2]);
      doc.setFont("helvetica", "italic");
      doc.text("Laporan ini dihasilkan secara otomatis oleh Sistem Absensi Digital dan tidak memerlukan tanda tangan basah.", 14, pageHeight - 10);

      doc.setFont("helvetica", "normal");
      doc.text(`Halaman ${i} dari ${totalPages}`, pageWidth - 14, pageHeight - 10, { align: "right" });
    }

    doc.save(`rekap-absensi-magang-${startDate}-${endDate}.pdf`);
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
        return <Badge className="bg-purple-100 text-purple-800">Libur</Badge>;
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

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleApplySelection = () => {
    setSelectedUserIds(tempSelectedIds);
    setIsModalOpen(false);
  };

  const handleOpenModal = () => {
    setTempSelectedIds(selectedUserIds);
    setSearchQuery("");
    setIsModalOpen(true);
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
                      <Button key={type} variant={periodType === type ? "default" : "outline"} size="sm" onClick={() => setPeriodType(type)} className={periodType === type ? "bg-yellow-400 hover:bg-yellow-500 text-black" : ""}>
                        {type === "daily" ? "Harian" : type === "weekly" ? "Mingguan" : "Bulanan"}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Date Range */}
                <div>
                  <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
                  <input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                </div>
                <div>
                  <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
                  <input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                </div>

                {/* Select User (UI/UX Pro Max Modal) */}
                <div className="min-w-[250px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Peserta</label>
                  <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        onClick={handleOpenModal}
                        className={`w-full justify-between bg-white border-gray-300 hover:border-yellow-400 hover:bg-yellow-50/30 transition-all duration-300 shadow-sm ${selectedUserIds.length > 0 ? " ring-2 ring-yellow-400/20 border-yellow-400" : ""}`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Filter className={`h-4 w-4 shrink-0 ${selectedUserIds.length > 0 ? "text-yellow-600" : "text-gray-400"}`} />
                          <span className="truncate font-medium">
                            {selectedUserIds.length === 0
                              ? "Semua Peserta Magang"
                              : selectedUserIds.length === employees.length
                                ? "Seluruh Peserta Magang"
                                : `${selectedUserIds.length} Peserta Magang`}
                          </span>
                        </div>
                        {selectedUserIds.length > 0 && (
                          <Badge className="ml-2 bg-yellow-400 text-black hover:bg-yellow-500 border-none px-1.5 h-5 min-w-5 flex items-center justify-center text-[10px] font-bold">
                            {selectedUserIds.length}
                          </Badge>
                        )}
                        <ChevronDown className={`h-4 w-4 opacity-50 shrink-0 transition-transform duration-300 ${isModalOpen ? "rotate-180" : ""}`} />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
                      <div className="bg-linear-to-br from-yellow-400 to-yellow-500 p-6 text-black">
                        <DialogHeader className="p-0">
                          <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                              <Users className="h-6 w-6" />
                            </div>
                            <div>
                              <DialogTitle className="text-2xl font-bold tracking-tight">Pilih Peserta</DialogTitle>
                              <p className="text-black/60 text-sm font-medium">Filter rekap absensi berdasarkan peserta</p>
                            </div>
                          </div>
                        </DialogHeader>
                      </div>

                      <div className="p-4 space-y-4 bg-white">
                        {/* Search and Quick Actions */}
                        <div className="flex flex-col gap-3">
                          <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-yellow-500 transition-colors" />
                            <Input
                              placeholder="Cari nama atau ID peserta..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-10 h-11 bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 transition-all rounded-xl"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-2 px-1">
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setTempSelectedIds(employees.map(e => e.id))}
                                className="h-8 text-xs font-semibold hover:bg-yellow-50 hover:text-yellow-600 rounded-lg gap-1.5"
                              >
                                <UserCheck className="h-3.5 w-3.5" /> Pilih Semua
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setTempSelectedIds([])}
                                className="h-8 text-xs font-semibold hover:bg-red-50 hover:text-red-600 rounded-lg gap-1.5"
                              >
                                <UserX className="h-3.5 w-3.5" /> Bersihkan
                              </Button>
                            </div>
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                              {tempSelectedIds.length} Terpilih
                            </span>
                          </div>
                        </div>

                        {/* Employee List */}
                        <div className="max-h-[350px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                          {filteredEmployees.length === 0 ? (
                            <div className="py-12 text-center flex flex-col items-center justify-center space-y-3 opacity-50">
                              <Search className="h-10 w-10 text-gray-300" />
                              <p className="text-sm font-medium text-gray-500">Peserta tidak ditemukan</p>
                            </div>
                          ) : (
                            <div className="grid gap-1">
                              {filteredEmployees.map((emp) => {
                                const isSelected = tempSelectedIds.includes(emp.id);
                                return (
                                  <div
                                    key={emp.id}
                                    onClick={() => {
                                      setTempSelectedIds(prev =>
                                        prev.includes(emp.id) ? prev.filter(id => id !== emp.id) : [...prev, emp.id]
                                      );
                                    }}
                                    className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 ${isSelected
                                      ? "bg-yellow-50 border border-yellow-200/50 shadow-sm"
                                      : "hover:bg-gray-50 border border-transparent"
                                      }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-transform duration-300 group-hover:scale-105 ${isSelected ? "bg-yellow-400 text-black" : "bg-gray-100 text-gray-500"
                                        }`}>
                                        {emp.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                                      </div>
                                      <div>
                                        <p className={`text-sm font-bold transition-colors ${isSelected ? "text-yellow-700" : "text-gray-700"}`}>
                                          {emp.name}
                                        </p>
                                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-tight">{emp.id}</p>
                                      </div>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${isSelected
                                      ? "bg-yellow-400 border-yellow-400 transform scale-110 shadow-md shadow-yellow-200"
                                      : "border-gray-200 group-hover:border-yellow-300"
                                      }`}>
                                      {isSelected && <Check className="h-3 w-3 text-black stroke-[4px]" />}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      <DialogFooter className="p-4 bg-gray-50 border-t flex-row sm:justify-between items-center gap-4">
                        <p className="text-xs font-medium text-gray-500 hidden sm:block">
                          Menampilkan <span className="text-black font-bold">{filteredEmployees.length}</span> Peserta Magang
                        </p>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <Button
                            variant="outline"
                            className="flex-1 sm:flex-none h-10 px-6 rounded-xl font-bold text-gray-500 hover:bg-white"
                            onClick={() => setIsModalOpen(false)}
                          >
                            Batal
                          </Button>
                          <Button
                            className="flex-1 sm:flex-none h-10 px-8 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-500 shadow-lg shadow-yellow-200 transition-all hover:-translate-y-px active:translate-y-0"
                            onClick={handleApplySelection}
                          >
                            Terapkan
                          </Button>
                        </div>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
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
                      <p className="text-sm text-gray-600">Total Peserta Magang</p>
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
                Rekap Per Peserta Magang
              </CardTitle>
              <CardDescription>
                Periode: {new Date(startDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} - {new Date(endDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
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
                        <div className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition" onClick={() => toggleUserExpand(user.userId)}>
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
                            <div className="text-center px-3 border-r border-gray-200 last:border-0">
                              <p className="text-[10px] uppercase tracking-tighter text-gray-400 font-bold mb-1 flex items-center justify-center gap-1">
                                <CheckCircle className="h-2.5 w-2.5 text-green-500" /> Hadir
                              </p>
                              <p className="font-extrabold text-green-600 text-lg leading-none">{user.present}</p>
                            </div>
                            <div className="text-center px-3 border-r border-gray-200 last:border-0">
                              <p className="text-[10px] uppercase tracking-tighter text-gray-400 font-bold mb-1 flex items-center justify-center gap-1">
                                <AlertTriangle className="h-2.5 w-2.5 text-yellow-500" /> Telat
                              </p>
                              <p className="font-extrabold text-yellow-600 text-lg leading-none">{user.late}</p>
                            </div>
                            <div className="text-center px-3 border-r border-gray-200 last:border-0">
                              <p className="text-[10px] uppercase tracking-tighter text-gray-400 font-bold mb-1 flex items-center justify-center gap-1">
                                <FileText className="h-2.5 w-2.5 text-blue-500" /> Izin
                              </p>
                              <p className="font-extrabold text-blue-600 text-lg leading-none">{user.permission}</p>
                            </div>
                            <div className="text-center px-3 border-r border-gray-200 last:border-0">
                              <p className="text-[10px] uppercase tracking-tighter text-gray-400 font-bold mb-1 flex items-center justify-center gap-1">
                                <XCircle className="h-2.5 w-2.5 text-red-500" /> Absen
                              </p>
                              <p className="font-extrabold text-red-600 text-lg leading-none">{user.absent}</p>
                            </div>
                            <div className="text-center px-3 border-r border-gray-200 last:border-0">
                              <p className="text-[10px] uppercase tracking-tighter text-gray-400 font-bold mb-1 flex items-center justify-center gap-1">
                                <Calendar className="h-2.5 w-2.5 text-purple-500" /> Libur
                              </p>
                              <p className="font-extrabold text-purple-600 text-lg leading-none">{user.holiday}</p>
                            </div>
                            <div className="text-center px-3 border-r border-gray-200 last:border-0">
                              <p className="text-[10px] uppercase tracking-tighter text-gray-400 font-bold mb-1">Weekend</p>
                              <p className="font-extrabold text-gray-500 text-lg leading-none">{user.weekend}</p>
                            </div>
                            <div className="pl-4">{isExpanded ? <ChevronUp className="h-6 w-6 text-yellow-500 bg-yellow-50 rounded-full p-1 transition-all" /> : <ChevronDown className="h-6 w-6 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 rounded-full p-1 transition-all" />}</div>
                          </div>
                        </div>

                        {/* User Detail Table */}
                        {isExpanded && (
                          <div className="p-4 bg-white border-t">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b bg-gray-50/50">
                                  <th className="text-left py-3 px-4 font-bold text-gray-600">Tanggal</th>
                                  <th className="text-left py-3 px-4 font-bold text-gray-600">Status</th>
                                  <th className="text-left py-3 px-4 font-bold text-gray-600">Status Izin</th>
                                  <th className="text-left py-3 px-4 font-bold text-gray-600">Masuk</th>
                                  <th className="text-left py-3 px-4 font-bold text-gray-600">Pulang</th>
                                  <th className="text-left py-3 px-4 font-bold text-gray-600">Catatan</th>
                                </tr>
                              </thead>
                              <tbody>
                                {userDetails.map((detail, idx) => (
                                  <tr key={idx} className={`border-b border-gray-100 hover:bg-gray-50/80 transition-colors ${detail.dayType === "holiday" ? "bg-purple-50/30" : detail.dayType === "weekend" ? "bg-gray-50/50" : ""}`}>
                                    <td className="py-3 px-4 font-medium">{formatDate(detail.date)}</td>
                                    <td className="py-3 px-4">{getStatusBadge(detail.status, detail.permissionType, detail.holidayName)}</td>
                                    <td className="py-3 px-4">{getPermissionStatusBadge(detail.permissionStatus) || "-"}</td>
                                    <td className="py-3 px-4">
                                      <div className="flex items-center gap-1.5 p-1.5 bg-gray-50 rounded-lg w-fit">
                                        <Clock className="h-3.5 w-3.5 text-yellow-500" />
                                        <span className={`font-mono text-xs ${detail.checkIn ? "text-gray-900 font-bold" : "text-gray-400"}`}>{detail.checkIn || "--:--"}</span>
                                      </div>
                                    </td>
                                    <td className="py-3 px-4">
                                      <div className="flex items-center gap-1.5 p-1.5 bg-gray-50 rounded-lg w-fit">
                                        <Clock className="h-3.5 w-3.5 text-yellow-500" />
                                        <span className={`font-mono text-xs ${detail.checkOut ? "text-gray-900 font-bold" : "text-gray-400"}`}>{detail.checkOut || "--:--"}</span>
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 text-gray-600 text-xs italic">{detail.status === "holiday" && detail.holidayName ? <span className="text-purple-600 font-bold not-italic">{detail.holidayName}</span> : detail.notes || "-"}</td>
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
