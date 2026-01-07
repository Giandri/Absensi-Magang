"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Users, Plus, Edit, Trash2, User, Mail, Phone, MapPin, Calendar } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { toast } from "sonner";

interface User {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  role: string;
  createdAt: string;
}

function UserForm({ user, onClose, onSuccess }: { user?: User; onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    address: user?.address || "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // TEMPORARY: Use PUT for both create and update until dynamic routes work
      const method = "PUT";
      const requestBody = user
        ? { ...formData, id: user.id } // For update, include id in body
        : formData; // For create, just formData

      const response = await fetch("/api/admin/users", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(user ? "Pegawai berhasil diperbarui" : "Pegawai berhasil ditambahkan");
        onSuccess();
        onClose();
      } else {
        toast.error(result.message || "Terjadi kesalahan");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan saat menyimpan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Nama Lengkap *</Label>
          <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
        </div>
        <div>
          <Label htmlFor="email">Email *</Label>
          <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="phone">No. Telepon</Label>
          <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="password">{user ? "Password Baru (kosongkan jika tidak diubah)" : "Password *"}</Label>
          <Input id="password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required={!user} />
        </div>
      </div>

      <div>
        <Label htmlFor="address">Alamat</Label>
        <Input id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Menyimpan..." : user ? "Perbarui" : "Tambah"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Batal
        </Button>
      </div>
    </form>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex gap-4 p-4 bg-white rounded-lg border">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

export default function KelolaPegawaiPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/users");
      const result = await response.json();

      if (response.ok) {
        console.log("📊 [FRONTEND] Users data received:", result.data);
        (result.data as User[]).forEach((user, index) => {
          console.log(`👤 [FRONTEND] User ${index}: id=${user.id}, name=${user.name}, email=${user.email}`);
        });
        setUsers(result.data as User[]);
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
    fetchUsers();
  }, []);

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Pegawai berhasil dihapus");
        fetchUsers();
      } else {
        toast.error(result.message || "Gagal menghapus pegawai");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan saat menghapus");
    }
  };

  const handleEditUser = (user: User) => {
    console.log("🎯 [FRONTEND] handleEditUser called with user:", user);
    console.log("🆔 [FRONTEND] user.id:", user.id, "type:", typeof user.id);
    setEditingUser(user);
    setDialogOpen(true);
  };

  const handleAddUser = () => {
    setEditingUser(undefined);
    setDialogOpen(true);
  };

  const handleFormSuccess = () => {
    fetchUsers();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
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
              <h1 className="text-3xl font-bold text-gray-900">Kelola Pegawai</h1>
              <p className="text-gray-600 mt-1">Tambah, edit, dan hapus data pegawai</p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAddUser} className="bg-green-600 hover:bg-green-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Pegawai
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>{editingUser ? "Edit Pegawai" : "Tambah Pegawai"}</DialogTitle>
                  <DialogDescription>{editingUser ? "Perbarui informasi pegawai" : "Tambahkan pegawai baru ke sistem"}</DialogDescription>
                </DialogHeader>
                <UserForm user={editingUser} onClose={() => setDialogOpen(false)} onSuccess={handleFormSuccess} />
              </DialogContent>
            </Dialog>
          </div>

          {/* Error State */}
          {error && (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-6">
                <p className="text-red-700">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Pegawai</p>
                      <p className="text-xl font-bold">{users.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <User className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Aktif</p>
                      <p className="text-xl font-bold text-green-600">{users.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Calendar className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Dibuat Bulan Ini</p>
                      <p className="text-xl font-bold text-purple-600">
                        {
                          users.filter((u) => {
                            const created = new Date(u.createdAt);
                            const now = new Date();
                            return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
                          }).length
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Daftar Pegawai
              </CardTitle>
              <CardDescription>Kelola semua pegawai yang terdaftar di sistem</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <TableSkeleton />
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Belum ada pegawai terdaftar</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 bg-white rounded-lg border hover:shadow-sm transition">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-lg font-bold text-black">{user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}</div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{user.name || "Nama belum diisi"}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {user.email}
                            </div>
                            {user.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {user.phone}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              Dibuat {formatDate(user.createdAt)}
                            </Badge>
                            {user.address && (
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <MapPin className="w-3 h-3" />
                                {user.address}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEditUser(user)} className="text-blue-600 border-blue-200 hover:bg-blue-50">
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                              <Trash2 className="w-4 h-4 mr-1" />
                              Hapus
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus Pegawai</AlertDialogTitle>
                              <AlertDialogDescription>
                                Apakah Anda yakin ingin menghapus pegawai "{user.name || user.email}"? Tindakan ini tidak dapat dibatalkan dan akan menghapus semua data absensi pegawai tersebut.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteUser(user.id)} className="bg-red-600 hover:bg-red-700">
                                Hapus
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
