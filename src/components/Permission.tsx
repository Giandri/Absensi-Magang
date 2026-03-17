"use client";

import React, { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, FileText, Stethoscope, CheckCircle, Loader2 } from "lucide-react";
import { useSubmitPermission } from "@/hooks/auth";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

interface PermissionProps {
  hasCheckedIn?: boolean;
}

export default function Permission({ hasCheckedIn = false }: PermissionProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [openType, setOpenType] = useState<"izin" | "sakit" | "libur" | null>(null);
  const [note, setNote] = useState("");
  const { data: session } = useSession();

  const mutation = useSubmitPermission();

  const handleOpen = (type: "izin" | "sakit" | "libur") => {
    if (hasCheckedIn) {
      toast.error("Tidak bisa pilih izin", {
        description: "Anda sudah melakukan absensi masuk hari ini.",
      });
      return;
    }
    setOpenType(type);
  };

  const handleSubmit = () => {
    if (!session?.user?.id) {
      toast.error("Silakan login kembali");
      return;
    }

    if (!note.trim()) {
      toast.error("Alasan/Keterangan wajib diisi");
      return;
    }

    mutation.mutate(
      {
        type: openType!,
        note: note,
      },
      {
        onSuccess: () => {
          toast.success(`Pengajuan ${openType} berhasil terkirim`);
          setOpenType(null);
          setNote("");
        },
        onError: (err: any) => {
          toast.error("Gagal mengirim pengajuan", {
            description: err.message,
          });
        },
      }
    );
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 min-h-[160px] animate-pulse">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="h-3 w-20 bg-slate-200 rounded mb-2"></div>
            <div className="h-6 w-32 bg-slate-200 rounded"></div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
           <div className="h-24 bg-slate-100 rounded-2xl"></div>
           <div className="h-24 bg-slate-100 rounded-2xl"></div>
           <div className="h-24 bg-slate-100 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pengecualian</p>
          <h3 className="font-black text-slate-800 text-lg">Keterangan Khusus</h3>
        </div>
        {!hasCheckedIn && (
          <div className="bg-slate-50 text-[10px] font-bold text-slate-400 px-2 py-1 rounded-md uppercase tracking-wider">Tersedia</div>
        )}
      </div>

      {hasCheckedIn && (
        <div className="flex items-center gap-3 text-emerald-600 bg-emerald-50 px-4 py-3 rounded-2xl mb-6 text-xs font-bold border border-emerald-100">
          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white">
            <CheckCircle className="w-4 h-4" />
          </div>
          <span>Izin tidak tersedia setelah absen.</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {/* LIBUR / CUTI */}
        <AlertDialog open={openType === "libur"} onOpenChange={(open) => !open && (setOpenType(null), setNote(""))}>
          <AlertDialogTrigger asChild>
            <button
              onClick={() => handleOpen("libur")}
              disabled={hasCheckedIn}
              className={`group flex flex-col items-center gap-2 p-3 rounded-2xl transition-all active:scale-95 ${
                hasCheckedIn ? "opacity-30 cursor-not-allowed" : "hover:bg-blue-50/50"
              }`}
            >
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center transition-all group-hover:bg-blue-600 group-hover:text-white shadow-sm ring-1 ring-blue-100 group-hover:ring-blue-600">
                <Calendar className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-black text-slate-600 uppercase tracking-tighter">Libur</span>
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="max-w-md rounded-3xl overflow-y-auto max-h-[90vh]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-center text-2xl font-black text-slate-800">Ajukan Libur 🏖️</AlertDialogTitle>
              <AlertDialogDescription className="text-center">
                Mohon berikan keterangan libur/cuti Anda.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="mt-4 relative">
              <Textarea 
                placeholder="Contoh: Cuti tahunan / Keperluan keluarga..." 
                value={note} 
                onChange={(e) => setNote(e.target.value)} 
                className="min-h-32 resize-none rounded-2xl border-blue-100 focus:ring-blue-500 focus:border-blue-500 p-4 font-medium" 
                maxLength={300} 
              />
              <div className="absolute bottom-3 right-3 bg-white/80 px-2 py-0.5 rounded text-[10px] font-bold text-blue-500 ring-1 ring-blue-100">
                {note.length}/300
              </div>
            </div>

            <AlertDialogFooter className="mt-6 sm:justify-center gap-2">
              <AlertDialogCancel className="rounded-xl font-bold">Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleSubmit} disabled={mutation.isPending || !note.trim()} className="bg-blue-600 hover:bg-blue-700 rounded-xl font-bold px-8">
                {mutation.isPending ? "Mengirim..." : "Konfirmasi Libur"}
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
              className={`group flex flex-col items-center gap-2 p-3 rounded-2xl transition-all active:scale-95 ${
                hasCheckedIn ? "opacity-30 cursor-not-allowed" : "hover:bg-amber-50/50"
              }`}
            >
              <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center transition-all group-hover:bg-amber-600 group-hover:text-white shadow-sm ring-1 ring-amber-100 group-hover:ring-amber-600">
                <FileText className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-black text-slate-600 uppercase tracking-tighter">Izin</span>
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="max-w-md rounded-3xl overflow-y-auto max-h-[90vh]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-center text-2xl font-black text-slate-800">Ajukan Izin 📝</AlertDialogTitle>
              <AlertDialogDescription className="text-center">
                Mohon sertakan alasan yang valid dan jelas.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="mt-4 relative">
              <Textarea 
                placeholder="Contoh: Ada keperluan mendesak di rumah..." 
                value={note} 
                onChange={(e) => setNote(e.target.value)} 
                className="min-h-32 resize-none rounded-2xl border-amber-100 focus:ring-amber-500 focus:border-amber-500 p-4 font-medium" 
                maxLength={300} 
              />
              <div className="absolute bottom-3 right-3 bg-white/80 px-2 py-0.5 rounded text-[10px] font-bold text-amber-500 ring-1 ring-amber-100">
                {note.length}/300
              </div>
            </div>

            <AlertDialogFooter className="mt-6 sm:justify-center gap-2">
              <AlertDialogCancel className="rounded-xl font-bold">Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleSubmit} disabled={mutation.isPending || !note.trim()} className="bg-amber-600 hover:bg-amber-700 rounded-xl font-bold px-8">
                {mutation.isPending ? "Mengirim..." : "Kirim Pengajuan"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* SAKIT */}
        <AlertDialog open={openType === "sakit"} onOpenChange={(open) => !open && (setOpenType(null), setNote(""))}>
          <AlertDialogTrigger asChild>
            <button
              onClick={() => handleOpen("sakit")}
              disabled={hasCheckedIn}
              className={`group flex flex-col items-center gap-2 p-3 rounded-2xl transition-all active:scale-95 ${
                hasCheckedIn ? "opacity-30 cursor-not-allowed" : "hover:bg-rose-50/50"
              }`}
            >
              <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center transition-all group-hover:bg-rose-600 group-hover:text-white shadow-sm ring-1 ring-rose-100 group-hover:ring-rose-600">
                <Stethoscope className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-black text-slate-600 uppercase tracking-tighter">Sakit</span>
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-3xl overflow-y-auto max-h-[90vh]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-center text-2xl font-black text-slate-800">Ajukan Sakit 💊</AlertDialogTitle>
              <AlertDialogDescription className="text-center">
                Mohon beri keterangan sakit Anda. Cepat sembuh!
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="mt-4 relative">
              <Textarea 
                placeholder="Contoh: Demam tinggi / Sedang berobat ke puskesmas..." 
                value={note} 
                onChange={(e) => setNote(e.target.value)} 
                className="min-h-32 resize-none rounded-2xl border-rose-100 focus:ring-rose-500 focus:border-rose-500 p-4 font-medium" 
                maxLength={300} 
              />
              <div className="absolute bottom-3 right-3 bg-white/80 px-2 py-0.5 rounded text-[10px] font-bold text-rose-500 ring-1 ring-rose-100">
                {note.length}/300
              </div>
            </div>

            <AlertDialogFooter className="mt-6 sm:justify-center gap-2">
              <AlertDialogCancel className="rounded-xl font-bold">Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleSubmit} disabled={mutation.isPending || !note.trim()} className="bg-rose-600 hover:bg-rose-700 rounded-xl font-bold px-8">
                {mutation.isPending ? "Mengirim..." : "Konfirmasi Sakit"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
