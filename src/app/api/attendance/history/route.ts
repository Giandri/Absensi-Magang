import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth.config";

export async function GET(request: NextRequest) {
  try {
    console.log("📅 [GET COMBINED HISTORY] Starting...");

    const session = await getServerSession(authOptions);
    let userId = session?.user?.id;

    if (!userId) {
      const { searchParams } = new URL(request.url);
      userId = searchParams.get("userId") ?? undefined;
    }

    // Fallback: get first user
    if (!userId) {
      const firstUser = await prisma.user.findFirst();
      userId = firstUser?.id;
    }

    if (!userId) {
      return NextResponse.json({ message: "Authentication required" }, { status: 401 });
    }

    console.log("✅ User authenticated:", userId);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    // ✅ AMBIL ATTENDANCE DAN PERMISSION SECARA BERSAMAAN
    const [attendances, permissions, totalAttendance, totalPermission] = await Promise.all([
      prisma.attendance.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        select: {
          id: true,
          date: true,
          checkInTime: true,
          checkOutTime: true,
          checkInLatitude: true,
          checkInLongitude: true,
          checkOutLatitude: true,
          checkOutLongitude: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.permission.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        select: {
          id: true,
          type: true,
          note: true,
          date: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.attendance.count({ where: { userId } }),
      prisma.permission.count({ where: { userId } }),
    ]);

    // ✅ FORMAT ATTENDANCE
    const formattedAttendances = attendances.map((attendance) => {
      const date = new Date(attendance.date);
      const checkInTime = attendance.checkInTime ? new Date(attendance.checkInTime) : null;
      const checkOutTime = attendance.checkOutTime ? new Date(attendance.checkOutTime) : null;

      return {
        id: attendance.id,
        type: "attendance", // ✅ Penanda tipe
        date: date.toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "Asia/Jakarta", // Enforce WIB
        }),
        dateISO: date.toISOString().split("T")[0],
        dateTimestamp: date.getTime(), // ✅ Untuk sorting
        status: attendance.status,
        checkIn: checkInTime
          ? checkInTime.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Jakarta", // Enforce WIB
          })
          : null,
        checkOut: checkOutTime
          ? checkOutTime.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Jakarta", // Enforce WIB
          })
          : null,
        checkInLocation:
          attendance.checkInLatitude && attendance.checkInLongitude
            ? `${Math.abs(attendance.checkInLatitude).toFixed(6)}°${attendance.checkInLatitude >= 0 ? "N" : "S"}, ${Math.abs(attendance.checkInLongitude).toFixed(6)}°${attendance.checkInLongitude >= 0 ? "E" : "W"}`
            : null,
        checkOutLocation:
          attendance.checkOutLatitude && attendance.checkOutLongitude
            ? `${Math.abs(attendance.checkOutLatitude).toFixed(6)}°${attendance.checkOutLatitude >= 0 ? "N" : "S"}, ${Math.abs(attendance.checkOutLongitude).toFixed(6)}°${attendance.checkOutLongitude >= 0 ? "E" : "W"}`
            : null,
        duration: checkInTime && checkOutTime ? Math.round(((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)) * 10) / 10 : null,
      };
    });

    // ✅ FORMAT PERMISSION
    const formattedPermissions = permissions.map((permission) => {
      const date = new Date(permission.date);

      return {
        id: permission.id,
        type: "permission", // ✅ Penanda tipe
        permissionType: permission.type, // izin/sakit/libur
        date: date.toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "Asia/Jakarta", // Enforce WIB
        }),
        dateISO: date.toISOString().split("T")[0],
        dateTimestamp: date.getTime(), // ✅ Untuk sorting
        status: permission.status,
        note: permission.note,
        label: permission.type === "izin" ? "Izin" : permission.type === "sakit" ? "Sakit" : "Libur",
        emoji: permission.type === "izin" ? "📝" : permission.type === "sakit" ? "🤒" : "🏖️",
        statusLabel: permission.status === "pending" ? "⏳ Menunggu" : permission.status === "approved" ? "✓ Disetujui" : "✗ Ditolak",
        statusColor: permission.status === "pending" ? "amber" : permission.status === "approved" ? "green" : "red",
        createdAt: new Date(permission.createdAt).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "Asia/Jakarta", // Enforce WIB
        }),
      };
    });

    // ✅ GABUNGKAN DAN SORT BERDASARKAN TANGGAL (TERBARU DULU)
    const combinedHistory = [...formattedAttendances, ...formattedPermissions].sort((a, b) => b.dateTimestamp - a.dateTimestamp);

    // ✅ PAGINATION SETELAH DIGABUNG
    const totalCount = totalAttendance + totalPermission;
    const paginatedHistory = combinedHistory.slice(offset, offset + limit);
    const totalPages = Math.ceil(totalCount / limit);

    console.log(`📋 Combined: ${paginatedHistory.length} items (${totalAttendance} attendance + ${totalPermission} permission)`);

    return NextResponse.json({
      status_code: 200,
      message: "History retrieved successfully",
      data: {
        history: paginatedHistory, // ✅ Gabungan attendance + permission
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        summary: {
          totalAttendance,
          totalPermission,
        },
      },
    });
  } catch (error) {
    console.error("💥 [GET COMBINED HISTORY] Error:", error);
    return NextResponse.json({ message: "Terjadi kesalahan server" }, { status: 500 });
  }
}
