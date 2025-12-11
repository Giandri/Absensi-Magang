"use client";

import { useState, useEffect, Suspense, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Header from "@/components/Header";
import { LogOut, User, Phone, Mail, MapPin, Save, X } from "lucide-react";

const useUserProfile = (userId?: string) => {
  const [data, setData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const router = useRouter();

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/profile", {
        credentials: "include",
      });

      if (response.status === 401) {
        console.log("Session invalid. Check server logs.");
        // router.push("/login");
      }

      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      } else {
        throw new Error("Gagal ambil data profil");
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (userId) {
      fetchProfile();
    } else {
      setIsLoading(false);
    }
  }, [userId, fetchProfile]);

  return { data, isLoading, error, refetch: fetchProfile };
};

interface UserData {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<UserData>({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const userId = useMemo(() => {
    if (session?.user?.id) return session.user.id;
    if (typeof window !== "undefined") {
      try {
        const userData = localStorage.getItem("user-data");
        if (userData) {
          const user = JSON.parse(userData);
          return user.id;
        }
      } catch (error) {
        console.error("Error parsing user data from localStorage:", error);
      }
    }
    return null;
  }, [session]);

  const { data: userData, isLoading: profileLoading, error: profileError, refetch } = useUserProfile(userId || undefined);

  // Check auth mirip sebelumnya
  useEffect(() => {
    const checkAuth = () => {
      if (session) {
        setIsAuthenticated(true);
        return;
      }
      if (typeof window !== "undefined") {
        const authToken = localStorage.getItem("auth-token");
        const userData = localStorage.getItem("user-data");
        if (authToken && userData) {
          setIsAuthenticated(true);
          return;
        }
      }
      setIsAuthenticated(false);
    };
    checkAuth();
  }, [session]);

  // Sync formData pas data masuk
  useEffect(() => {
    if (userData) {
      setFormData(userData);
    }
  }, [userData]);

  const handleEdit = () => {
    setOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Gagal simpan profil");
      }

      toast.success("Profil berhasil diperbarui!");
      await refetch();
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Gagal simpan profil");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth-token");
      localStorage.removeItem("user-data");
    }
    await signOut({ redirect: false });
    router.push("/login");
  };

  // Loading skeleton mirip riwayat
  if (status === "loading" || profileLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="pb-24">
          <Header />
          <div className="flex justify-center pt-8 pb-4">
            <Skeleton className="w-28 h-28 rounded-full" />
          </div>
          <div className="mx-4">
            <div className="bg-gray-200 rounded-2xl p-5">
              <Skeleton className="h-6 w-32 mb-4" />
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="w-5 h-5" />
                    <div className="flex-1">
                      <Skeleton className="h-3 w-16 mb-1" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <Navbar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="pb-24">
        <Header />

        {/* Avatar */}
        <div className="flex justify-center pt-8 pb-4">
          <div className="w-28 h-28 bg-gray-200 rounded-full flex items-center justify-center shadow-lg">
            <User className="w-14 h-14 text-gray-500" strokeWidth={1.5} />
          </div>
        </div>

        {/* Profile Info Card - mirip card di riwayat */}
        <div className="mx-4 mt-6">
          <div className="bg-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-900">Profile Info</h2>
              <Button variant="outline" size="sm" onClick={handleEdit} className="h-8 px-4 rounded-full border-gray-400 text-gray-700 hover:bg-gray-300">
                Edit
              </Button>
            </div>

            {profileError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-700 text-sm">Gagal muat profil: {profileError.message}</p>
              </div>
            )}

            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <User className="w-6 h-6 text-gray-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Nama</p>
                  <p className="text-base font-semibold text-gray-900">{userData?.name || "-"}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Phone className="w-6 h-6 text-gray-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Nomor HP</p>
                  <p className="text-base font-semibold text-gray-900">{userData?.phone || "-"}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Mail className="w-6 h-6 text-gray-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">E-Mail</p>
                  <p className="text-base font-semibold text-gray-900">{userData?.email || "-"}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <MapPin className="w-6 h-6 text-gray-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Alamat</p>
                  <p className="text-base font-semibold text-gray-900">{userData?.address || "-"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <div className="mx-4 mt-6">
          <Button onClick={handleLogout} variant="outline" className="w-full h-14 rounded-xl border-red-200 bg-white hover:bg-red-50 text-red-600 font-semibold text-base gap-3">
            <LogOut className="w-5 h-5" />
            <span>Keluar</span>
          </Button>
        </div>
      </div>

      {/* DRAWER EDIT - mirip drawer detail di riwayat */}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <div className="mx-auto w-full">
            <DrawerHeader>
              <div className="flex justify-between items-center">
                <DrawerTitle>Edit Profil</DrawerTitle>
                <DrawerClose asChild>
                  <button className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
                </DrawerClose>
              </div>
            </DrawerHeader>

            <div className="px-6 py-4 pb-8 max-h-[70vh] overflow-y-auto">
              <div className="space-y-5">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Nama</p>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="h-9 bg-white" />
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-1">Nomor HP</p>
                  <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="h-9 bg-white" />
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-1">E-Mail (Tidak bisa diubah)</p>
                  <Input type="email" value={formData.email} disabled className="h-9 bg-gray-100" />
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-1">Alamat</p>
                  <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="h-9 bg-white" />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <Button variant="outline" onClick={() => setOpen(false)} className="flex-1 h-10 rounded-lg border-gray-400">
                  <X className="w-4 h-4 mr-2" /> Batal
                </Button>
                <Button onClick={handleSave} disabled={isSaving} className="flex-1 h-10 rounded-lg bg-green-600 hover:bg-green-700 text-white">
                  {isSaving ? (
                    "..."
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" /> Simpan
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <Navbar />
    </div>
  );
}
