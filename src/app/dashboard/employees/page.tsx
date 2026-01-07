"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Phone, Mail, MapPin, User, MessageCircle, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  createdAt: string;
}

export default function EmployeesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch("/api/admin/employees");
        const result = await response.json();

        if (response.ok) {
          setEmployees(result.data);
        } else {
          setError(result.message || "Gagal mengambil data karyawan");
        }
      } catch (err) {
        setError("Terjadi kesalahan saat mengambil data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  const filteredEmployees = employees.filter((employee) => employee.name?.toLowerCase().includes(searchQuery.toLowerCase()) || employee.email?.toLowerCase().includes(searchQuery.toLowerCase()));

  const getWhatsAppUrl = (phone: string | null, message: string) => {
    if (!phone) return null;

    let formattedPhone = phone.replace(/\D/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "62" + formattedPhone.slice(1);
    }

    // Encode pesan untuk URL
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
  };

  const handleWhatsApp = (phone: string | null, employeeName: string | null = null, messageTemplate: string = "default") => {
    if (!phone) return;

    let message = "";

    switch (messageTemplate) {
      case "reminder":
        message = `Halo${employeeName ? ` ${employeeName}` : ""}, ini adalah pengingat dari admin MAGANG BWS. Pastikan Anda melakukan absensi masuk dan keluar hari ini. Terima kasih.`;
        break;
      case "permission":
        message = `Halo${employeeName ? ` ${employeeName}` : ""}, Anda belum melakukan absensi masuk jika berkehalangan masuk segera mengisi keterangan izin.Terima kasih.`;
        break;
      case "warning":
        message = `Halo${employeeName ? ` ${employeeName}` : ""}, kami melihat ada ketidaksesuaian dalam data absensi Anda. Mohon konfirmasi dan perbaiki segera.`;
        break;
      default:
        message = `Halo${employeeName ? ` ${employeeName}` : ""}, saya admin dari sistem absensi MAGANG BWS. Ada yang ingin saya tanyakan mengenai kehadiran Anda.`;
    }

    const url = getWhatsAppUrl(phone, message);
    if (url) {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Hubungi Pemagang</h1>
              <p className="text-gray-600 mt-1">Daftar kontak peserta magang</p>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input placeholder="Cari nama atau email..." className="pl-10 bg-white" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </div>

          {/* Error State */}
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

          {/* Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              // Loading Skeletons
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-4">
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))
            ) : filteredEmployees.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-lg border border-dashed">
                <User className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Tidak ada karyawan ditemukan</p>
              </div>
            ) : (
              // Employee Cards
              filteredEmployees.map((employee) => (
                <Card key={employee.id} className="hover:shadow-md transition-shadow duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 font-bold text-lg">{employee.name ? employee.name.charAt(0).toUpperCase() : "U"}</div>
                        <div>
                          <h3 className="font-semibold text-gray-900 line-clamp-1">{employee.name || "Tanpa Nama"}</h3>
                          <p className="text-xs text-gray-500 line-clamp-1">{employee.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="truncate">{employee.phone || "-"}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="truncate line-clamp-1">{employee.address || "-"}</span>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="w-full bg-green-600 hover:bg-green-700 text-white gap-2" disabled={!employee.phone}>
                          <MessageCircle className="w-4 h-4" />
                          Hubungi via WhatsApp
                          <ChevronDown className="w-4 h-4 ml-auto" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuItem onClick={() => handleWhatsApp(employee.phone, employee.name, "default")} className="cursor-pointer text-gray-600">
                          Pesan Umum
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleWhatsApp(employee.phone, employee.name, "reminder")} className="cursor-pointer text-orange-400">
                          Pengingat Absensi
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleWhatsApp(employee.phone, employee.name, "permission")} className="cursor-pointer text-blue-600">
                          Info Izin
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleWhatsApp(employee.phone, employee.name, "warning")} className="cursor-pointer text-red-600">
                          Peringatan
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
