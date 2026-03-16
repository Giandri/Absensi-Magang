"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface ManualAttendanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: {
    date: string;
    checkInTime?: string;
    checkOutTime?: string;
    notes?: string;
  };
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function ManualAttendanceModal({
  open,
  onOpenChange,
  initialData,
  onSuccess,
  trigger,
}: ManualAttendanceModalProps) {
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    date: "",
    checkInTime: "",
    checkOutTime: "",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      const dateValue = initialData?.date
        ? (initialData.date.includes("T") ? initialData.date.split("T")[0] : initialData.date)
        : new Date().toISOString().split("T")[0];

      setFormData({
        date: dateValue,
        checkInTime: initialData?.checkInTime || "",
        checkOutTime: initialData?.checkOutTime || "",
        notes: initialData?.notes || "",
      });
    }
  }, [open, initialData]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const checkInISO = formData.checkInTime
        ? new Date(`${formData.date}T${formData.checkInTime}:00`).toISOString()
        : null;
      const checkOutISO = formData.checkOutTime
        ? new Date(`${formData.date}T${formData.checkOutTime}:00`).toISOString()
        : null;

      const response = await fetch("/api/admin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session?.user?.id,
          ...formData,
          checkInTime: checkInISO,
          checkOutTime: checkOutISO,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(result.message || "Berhasil menyimpan absensi");
        onOpenChange(false);
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.reload();
        }
      } else {
        toast.error(result.message || "Gagal menyimpan absensi");
      }
    } catch (err) {
      console.error(err);
      toast.error("Terjadi kesalahan sistem");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger}
      <DialogContent className="sm:max-w-[425px] bg-white rounded-3xl overflow-y-auto max-h-[90vh]">

        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">Manual Presensi</DialogTitle>
          <DialogDescription className="text-gray-500">
            Digunakan jika anda lupa mengisi absensi atau ada kendala jaringan.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="manual-date" className="text-sm font-semibold text-gray-700">Tanggal</Label>
            <Input
              id="manual-date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
              max={new Date().toLocaleDateString('en-CA')} // YYYY-MM-DD format
              disabled={!!initialData?.date}
              className="rounded-xl border-gray-100 focus:border-yellow-400 focus:ring-yellow-400 disabled:bg-gray-50 disabled:text-gray-500"
            />

          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="manual-checkIn" className="text-sm font-semibold text-gray-700">Jam Masuk</Label>
              <Input
                id="manual-checkIn"
                type="time"
                value={formData.checkInTime}
                onChange={(e) => setFormData({ ...formData, checkInTime: e.target.value })}
                disabled={!!initialData?.checkInTime}
                className="rounded-xl border-gray-100 focus:border-yellow-400 focus:ring-yellow-400 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-checkOut" className="text-sm font-semibold text-gray-700">Jam Pulang</Label>
              <Input
                id="manual-checkOut"
                type="time"
                value={formData.checkOutTime}
                onChange={(e) => setFormData({ ...formData, checkOutTime: e.target.value })}
                autoFocus={!!initialData?.checkInTime}
                className="rounded-xl border-gray-100 focus:border-yellow-400 focus:ring-yellow-400"
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold h-12 rounded-xl shadow-lg transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Presensi"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
