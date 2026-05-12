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
import { LogOut, User, Phone, Mail, MapPin, Save, X, LayoutDashboard, Briefcase, ChevronRight } from "lucide-react";

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
  position?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<UserData>({
    name: "",
    email: "",
    phone: "",
    address: "",
    position: "",
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

  // Check auth
  useEffect(() => {
    const checkAuth = () => {
      if (session) {
        setIsAuthenticated(true);
        return;
      }
      if (typeof window !== "undefined") {
        const authToken = localStorage.getItem("auth-token");
        const localData = localStorage.getItem("user-data");
        if (authToken && localData) {
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
          position: formData.position,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Gagal simpan profil");
      }

      toast.success("Profil berhasil diperbarui!");
      await refetch();
      // Update session to reflect the new position in Header without reloading
      await update({
        ...session,
        user: {
          ...session?.user,
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
          position: formData.position,
        }
      });
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Gagal simpan profil");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth-token");
      localStorage.removeItem("user-data");
    }
    signOut({ callbackUrl: "/login" });
  };

  if (status === "loading" || profileLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-white">
        <div className="pb-24 pt-10">
          <div className="flex flex-col items-center pt-8 pb-4">
            <Skeleton className="w-24 h-24 rounded-full mb-4" />
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32 mb-5" />
            <Skeleton className="h-10 w-32 rounded-full" />
          </div>
        </div>
        <Navbar />
      </div>
    );
  }

  // Check admin role
  const userRole = session?.user?.role;
  const localUserData = typeof window !== "undefined" ? localStorage.getItem("user-data") : null;
  let localRole = null;
  if (localUserData) {
    try {
      const user = JSON.parse(localUserData);
      localRole = user.role;
    } catch (error) { }
  }
  const isAdmin = userRole === "admin" || localRole === "admin";

  return (
    <div className="min-h-screen bg-[#fafafa] pt-10 font-sans">
      <div className="pb-32 flex flex-col items-center">

        {/* Avatar Section */}
        <div className="flex flex-col items-center mt-8 mb-8">
          <div className="w-[88px] h-[88px] bg-[#bcf5ce] rounded-full flex items-center justify-center overflow-hidden mb-4 shadow-sm">
            <User className="w-12 h-12 text-[#2e5e3f]" strokeWidth={1.5} />
          </div>
          <h1 className="text-[22px] font-bold text-black mb-0.5">{userData?.name || "Memuat..."}</h1>
          <p className="text-[13px] text-gray-500 mb-5">{userData?.email || "email@domain.com"}</p>
          <button onClick={handleEdit} className="bg-black text-white px-6 py-[10px] rounded-full text-[15px] font-medium active:scale-95 transition-transform shadow-md">
            Edit profile
          </button>
        </div>

        {profileError && (
          <div className="w-full max-w-md px-5 mb-4">
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center">
              <p className="text-rose-700 text-sm font-medium">Gagal muat profil: {profileError.message}</p>
            </div>
          </div>
        )}

        {/* Informasi Akun */}
        <div className="w-full max-w-md px-5 mb-8">
          <h3 className="text-[13px] font-medium text-gray-500 mb-2.5 px-1">Informasi Akun</h3>
          <div className="bg-[#f4f4f5] rounded-[24px] p-2 border border-gray-100 shadow-sm">

            {/* Nomor HP */}
            <div className="flex items-center justify-between p-2">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 bg-white rounded-[14px] flex items-center justify-center shadow-sm border border-gray-100">
                  <Phone className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
                </div>
                <span className="text-[15px] font-medium text-gray-900">Nomor HP</span>
              </div>
              <div className="flex items-center gap-2 pr-2">
                <span className="text-[14px] text-gray-500">{userData?.phone || "-"}</span>
                <ChevronRight className="w-[18px] h-[18px] text-gray-400" />
              </div>
            </div>

            <div className="h-[1px] bg-gray-200/70 mx-4 my-0.5" />

            {/* Posisi */}
            <div className="flex items-center justify-between p-2">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 bg-white rounded-[14px] flex items-center justify-center shadow-sm border border-gray-100">
                  <Briefcase className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
                </div>
                <span className="text-[15px] font-medium text-gray-900">Posisi</span>
              </div>
              <div className="flex items-center gap-2 pr-2">
                <span className="text-[14px] text-gray-500 truncate max-w-[120px]">{userData?.position || "Peserta"}</span>
                <ChevronRight className="w-[18px] h-[18px] text-gray-400" />
              </div>
            </div>

            <div className="h-[1px] bg-gray-200/70 mx-4 my-0.5" />

            {/* Alamat */}
            <div className="flex items-center justify-between p-2">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 bg-white rounded-[14px] flex items-center justify-center shadow-sm border border-gray-100">
                  <MapPin className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
                </div>
                <span className="text-[15px] font-medium text-gray-900">Alamat</span>
              </div>
              <div className="flex items-center gap-2 pr-2">
                <span className="text-[14px] text-gray-500 truncate max-w-[100px]">{userData?.address || "-"}</span>
                <ChevronRight className="w-[18px] h-[18px] text-gray-400" />
              </div>
            </div>

          </div>
        </div>

        {/* Pengaturan & Aksi */}
        <div className="w-full max-w-md px-5">
          <h3 className="text-[13px] font-medium text-gray-500 mb-2.5 px-1">Pengaturan & Aksi</h3>
          <div className="bg-[#f4f4f5] rounded-[24px] p-2 border border-gray-100 shadow-sm">

            {isAdmin && (
              <>
                <div className="flex items-center justify-between p-2 cursor-pointer active:scale-[0.98] transition-transform" onClick={() => router.push("/dashboard")}>
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 bg-white rounded-[14px] flex items-center justify-center shadow-sm border border-gray-100">
                      <LayoutDashboard className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
                    </div>
                    <span className="text-[15px] font-medium text-gray-900">Dashboard Admin</span>
                  </div>
                  <div className="pr-2">
                    <ChevronRight className="w-[18px] h-[18px] text-gray-400" />
                  </div>
                </div>
                <div className="h-[1px] bg-gray-200/70 mx-4 my-0.5" />
              </>
            )}

            {/* Logout */}
            <div className="flex items-center justify-between p-2 cursor-pointer active:scale-[0.98] transition-transform" onClick={handleLogout}>
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 bg-[#ffe8e8] rounded-[14px] flex items-center justify-center shadow-sm border border-red-50">
                  <LogOut className="w-5 h-5 text-[#c92a2a]" strokeWidth={1.5} />
                </div>
                <span className="text-[15px] font-medium text-[#c92a2a]">Logout</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* DRAWER EDIT */}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="rounded-t-[2rem] bg-white">
          <div className="mx-auto w-12 h-1.5 bg-gray-200 rounded-full my-4" />
          <div className="mx-auto w-full px-5 sm:px-6">
            <DrawerHeader className="px-0 pt-0 pb-6 text-center">
              <DrawerTitle className="text-[20px] font-bold text-black tracking-tight">Edit Profil</DrawerTitle>
            </DrawerHeader>

            <div className="pb-12 max-h-[70vh] overflow-y-auto no-scrollbar">
              <div className="space-y-4">
                <div>
                  <p className="text-[13px] font-medium text-gray-500 mb-1.5 ml-1">Nama</p>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="h-[46px] bg-[#f4f4f5] border-transparent rounded-[16px] px-4 font-medium text-black focus-visible:ring-black focus-visible:ring-offset-0" />
                </div>

                <div>
                  <p className="text-[13px] font-medium text-gray-500 mb-1.5 ml-1">Nomor HP</p>
                  <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="h-[46px] bg-[#f4f4f5] border-transparent rounded-[16px] px-4 font-medium text-black focus-visible:ring-black focus-visible:ring-offset-0" />
                </div>

                <div>
                  <p className="text-[13px] font-medium text-gray-500 mb-1.5 ml-1">E-Mail</p>
                  <Input type="email" value={formData.email} disabled className="h-[46px] bg-gray-100 border-transparent rounded-[16px] px-4 font-medium text-gray-400 opacity-70" />
                </div>

                <div>
                  <p className="text-[13px] font-medium text-gray-500 mb-1.5 ml-1">Alamat</p>
                  <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="h-[46px] bg-[#f4f4f5] border-transparent rounded-[16px] px-4 font-medium text-black focus-visible:ring-black focus-visible:ring-offset-0" />
                </div>

                <div>
                  <p className="text-[13px] font-medium text-gray-500 mb-1.5 ml-1">Posisi Magang</p>
                  <Input value={formData.position || ""} onChange={(e) => setFormData({ ...formData, position: e.target.value })} placeholder="Cth: Peserta Magang" className="h-[46px] bg-[#f4f4f5] border-transparent rounded-[16px] px-4 font-medium text-black focus-visible:ring-black focus-visible:ring-offset-0" />
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-8">
                <Button onClick={handleSave} disabled={isSaving} className="w-full h-[50px] rounded-[16px] bg-black hover:bg-gray-800 text-white font-medium text-[15px] shadow-sm transition-transform active:scale-[0.98]">
                  {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
                <Button variant="ghost" onClick={() => setOpen(false)} className="w-full h-[50px] rounded-[16px] font-medium text-gray-500 text-[15px] hover:bg-gray-100 transition-colors">
                  Batal
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

