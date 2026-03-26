import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth.config";

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { date, checkOutTime } = await request.json();

    if (!date || !checkOutTime) {
      return NextResponse.json({ message: "Tanggal dan jam pulang wajib diisi" }, { status: 400 });
    }

    // Pastikan bukan hari ini (hanya boleh hari sebelumnya)
    const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
    if (date === todayStr) {
      return NextResponse.json({ message: "Tidak bisa input manual untuk hari ini" }, { status: 400 });
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);

    // Cari attendance milik user sendiri
    const attendance = await prisma.attendance.findFirst({
      where: {
        userId: session.user.id,
        date: {
          gte: targetDate,
          lt: nextDay,
        },
      },
    });

    if (!attendance) {
      return NextResponse.json({ message: "Data absen tidak ditemukan untuk tanggal ini" }, { status: 404 });
    }

    if (!attendance.checkInTime) {
      return NextResponse.json({ message: "Belum ada data absen masuk" }, { status: 400 });
    }

    if (attendance.checkOutTime) {
      return NextResponse.json({ message: "Jam pulang sudah tercatat" }, { status: 400 });
    }

    const checkOutDate = new Date(checkOutTime);

    // Validasi: checkout harus setelah checkin
    if (checkOutDate <= new Date(attendance.checkInTime)) {
      return NextResponse.json({ message: "Jam pulang harus setelah jam masuk" }, { status: 400 });
    }

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOutTime: checkOutDate,
        notes: attendance.notes || "Manual checkout oleh user",
      },
    });

    return NextResponse.json({
      status_code: 200,
      message: "Jam pulang berhasil disimpan",
      data: updated,
    });
  } catch (error) {
    console.error("Manual checkout error:", error);
    return NextResponse.json({ message: "Terjadi kesalahan server" }, { status: 500 });
  }
}
