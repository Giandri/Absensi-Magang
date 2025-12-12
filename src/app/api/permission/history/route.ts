// app/api/permission/history/route.ts
// 100% MIRIP DENGAN ATTENDANCE HISTORY — TAPI UNTUK PERMISSION

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    console.log("[GET PERMISSION HISTORY] Mulai...");

    const session = await auth();
    let userId = session?.user?.id;

    // Fallback kalau dipanggil dari admin atau debug
    if (!userId) {
      const { searchParams } = new URL(request.url);
      userId = searchParams.get("userId") ?? undefined;
    }

    if (!userId) {
      return NextResponse.json({ message: "Login dulu!" }, { status: 401 });
    }

    console.log("User ID:", userId);

    // Pagination
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") || "10")); // max 50
    const offset = (page - 1) * limit;

    const [permissions, totalCount] = await Promise.all([
      prisma.permission.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          type: true,
          note: true,
          status: true,
          date: true,
          createdAt: true,
        },
      }),
      prisma.permission.count({ where: { userId } }),
    ]);

    // Format tanggal Indonesia + status badge
    const formattedPermissions = permissions.map((p) => {
      const tanggal = new Date(p.date);

      return {
        id: p.id,
        tanggal: tanggal.toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        tanggalISO: tanggal.toISOString().split("T")[0],
        type: p.type,
        label: p.type === "izin" ? "Izin" : p.type === "sakit" ? "Sakit" : "Libur",
        note: p.note || "-",
        status: p.status,
        statusLabel: p.status === "pending" ? "Menunggu" : p.status === "approved" ? "Disetujui" : p.status === "rejected" ? "Ditolak" : "Menunggu",
        statusColor: p.status === "pending" ? "yellow" : p.status === "approved" ? "green" : "red",
        diajukan: new Date(p.createdAt).toLocaleString("id-ID"),
      };
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      status_code: 200,
      message: "Riwayat permission berhasil diambil",
      data: {
        permissions: formattedPermissions,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("[GET PERMISSION HISTORY] Error:", error);
    return NextResponse.json({ message: "Gagal mengambil riwayat permission" }, { status: 500 });
  }
}
