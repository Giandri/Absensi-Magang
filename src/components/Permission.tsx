"use client";

import { Calendar, FileText, Stethoscope, Loader2, CheckCircle } from "lucide-react";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogAction, AlertDialogCancel, AlertDialogDescription } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { useSubmitPermission, useTodayAttendance } from "@/hooks/auth";
import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

export default function Permission() {
  const [openType, setOpenType] = useState<"izin" | "sakit" | "libur" | null>(null);
  const [note, setNote] = useState("");

  const { data: session } = useSession();
  const mutation = useSubmitPermission();
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
        console.error("Error parsing user data:", error);
      }
    }
    return null;
  }, [session]);

  {/* DETEKSI ABSENSI */ }
  const { data: todayAttendance } = useTodayAttendance(userId);
  const hasCheckedIn = !!todayAttendance?.attendance?.checkInTime;

  const handleOpen = (type: "izin" | "sakit" | "libur") => {
    if (hasCheckedIn) {
      toast.error("Tidak bisa mengajukan izin", {
        description: "Anda sudah melakukan absensi hari ini.",
        duration: 4000,
      });
      return;
    }

    setOpenType(type);
    if (type !== "izin") setNote("");
  };

  const handleSubmit = () => {
    if (openType === "izin" && !note.trim()) return;

    mutation.mutate(
      {
        type: openType!,
        note: openType === "izin" ? note.trim() : undefined,
      },
      {
        onSuccess: () => {
          setOpenType(null);
          setNote("");
        },
      }
    );
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
      <h3 className="text-center font-bold text-lg mb-6 text-gray-800">Keterangan Tidak Hadir</h3>

      {/* Pesan jika sudah absen */}
      {hasCheckedIn && (
        <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg mb-4 text-sm">
          <CheckCircle className="w-4 h-4" />
          <span>Anda sudah absen hari ini</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-5">
        {/* LIBUR */}
        <AlertDialog open={openType === "libur"} onOpenChange={(open) => !open && setOpenType(null)}>
          <AlertDialogTrigger asChild>
            <button
              onClick={() => handleOpen("libur")}
              disabled={hasCheckedIn}
              className={`group flex flex-col items-center gap-3 p-5 rounded-2xl transition active:scale-95 ${hasCheckedIn
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-blue-50"
                }`}
            >
              <div className={`w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center transition ${!hasCheckedIn && "group-hover:scale-110"}`}>
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">Libur</span>
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-center text-xl">Selamat Berlibur!</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-6">
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleSubmit} disabled={mutation.isPending} className="bg-blue-600 hover:bg-blue-700">
                {mutation.isPending ? <Loader2 className="animate-spin" /> : "Konfirmasi"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* IZIN */}
        <AlertDialog open={openType === "izin"} onOpenChange={(open) => !open && (setOpenType(null), setNote(""))}>
          <AlertDialogTrigger asChild>
            <button
              onClick={() => handleOpen("izin")}
              disabled={hasCheckedIn}
              className={`group flex flex-col items-center gap-3 p-5 rounded-2xl transition active:scale-95 ${hasCheckedIn
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-amber-50"
                }`}
            >
              <div className={`w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center transition ${!hasCheckedIn && "group-hover:scale-110"}`}>
                <FileText className="w-8 h-8 text-amber-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">Izin</span>
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-center text-xl">Ajukan Izin</AlertDialogTitle>
            </AlertDialogHeader>

            <Textarea placeholder="Tulis alasan izin hari ini..." value={note} onChange={(e) => setNote(e.target.value)} className="mt-4 min-h-32 resize-none" maxLength={300} />
            <p className="text-right text-xs text-gray-500 mt-1">{note.length}/300</p>

            <AlertDialogFooter className="mt-6">
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleSubmit} disabled={mutation.isPending || !note.trim()} className="bg-amber-600 hover:bg-amber-700">
                {mutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Mengirim...
                  </>
                ) : (
                  "Kirim Izin"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* SAKIT */}
        <AlertDialog open={openType === "sakit"} onOpenChange={(open) => !open && setOpenType(null)}>
          <AlertDialogTrigger asChild>
            <button
              onClick={() => handleOpen("sakit")}
              disabled={hasCheckedIn}
              className={`group flex flex-col items-center gap-3 p-5 rounded-2xl transition active:scale-95 ${hasCheckedIn
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-red-50"
                }`}
            >
              <div className={`w-16 h-16 bg-red-100 rounded-full flex items-center justify-center transition ${!hasCheckedIn && "group-hover:scale-110"}`}>
                <Stethoscope className="w-8 h-8 text-red-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">Sakit</span>
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-center text-xl">Semoga Cepat Sembuh</AlertDialogTitle>
              <AlertDialogDescription className="text-center pt-2">Istirahat yang cukup ya</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-6">
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleSubmit} disabled={mutation.isPending} className="bg-red-600 hover:bg-red-700">
                {mutation.isPending ? <Loader2 className="animate-spin" /> : "Konfirmasi"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
