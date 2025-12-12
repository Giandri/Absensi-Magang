import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth.config";
import { getLocationName } from "@/lib/geocoding";

export async function GET(request: NextRequest) {
    try {
        console.log("📊 [ADMIN ATTENDANCE] Starting...");

        // Cek session admin (opsional, bisa ditambah validasi role)
        const session = await getServerSession(authOptions);
        console.log("📋 Session:", session);

        // Ambil parameter tanggal dari query
        const { searchParams } = new URL(request.url);
        const dateParam = searchParams.get("date");

        // Default ke hari ini jika tidak ada parameter tanggal
        const targetDate = dateParam ? new Date(dateParam) : new Date();
        targetDate.setHours(0, 0, 0, 0);

        const nextDay = new Date(targetDate);
        nextDay.setDate(targetDate.getDate() + 1);

        // Ambil semua user
        const allUsers = await prisma.user.findMany({
            where: { role: "user" }, // Hanya user biasa, bukan admin
            select: {
                id: true,
                name: true,
                email: true,
            },
        });

        // Ambil attendance hari ini untuk semua user
        const attendances = await prisma.attendance.findMany({
            where: {
                date: {
                    gte: targetDate,
                    lt: nextDay,
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: { checkInTime: "desc" },
        });

        // Format data untuk dashboard dengan geocoding
        const formattedAttendance = await Promise.all(
            attendances.map(async (att) => {
                const checkInTime = att.checkInTime ? new Date(att.checkInTime) : null;
                const checkOutTime = att.checkOutTime ? new Date(att.checkOutTime) : null;

                // Hitung jam kerja
                let workHours = "0j 0m";
                if (checkInTime && checkOutTime) {
                    const diffMs = checkOutTime.getTime() - checkInTime.getTime();
                    const hours = Math.floor(diffMs / (1000 * 60 * 60));
                    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                    workHours = `${hours}j ${minutes}m`;
                } else if (checkInTime) {
                    // Jika belum checkout, hitung sampai sekarang
                    const now = new Date();
                    const diffMs = now.getTime() - checkInTime.getTime();
                    const hours = Math.floor(diffMs / (1000 * 60 * 60));
                    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                    workHours = `${hours}j ${minutes}m (berjalan)`;
                }

                // Konversi koordinat ke nama lokasi
                const location = await getLocationName(att.checkInLatitude, att.checkInLongitude);

                return {
                    id: att.id,
                    employee: att.user.name || att.user.email,
                    email: att.user.email,
                    userId: att.user.id,
                    checkIn: checkInTime
                        ? checkInTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })
                        : null,
                    checkOut: checkOutTime
                        ? checkOutTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })
                        : null,
                    status: att.status,
                    location: location,
                    workHours,
                    notes: att.notes || "",
                    checkInLatitude: att.checkInLatitude,
                    checkInLongitude: att.checkInLongitude,
                };
            })
        );

        // Hitung statistik
        const presentCount = attendances.filter((a) => a.status === "present").length;
        const lateCount = attendances.filter((a) => a.status === "late").length;
        const totalUsers = allUsers.length;

        // User yang tidak hadir (tidak ada record attendance)
        const presentUserIds = attendances.map((a) => a.userId);
        const absentUsers = allUsers.filter((u) => !presentUserIds.includes(u.id));
        const absentCount = absentUsers.length;

        // Aktivitas terbaru (5 terakhir)
        const recentActivities = attendances.slice(0, 5).map((att) => ({
            id: att.id,
            employee: att.user.name || att.user.email,
            action: att.checkOutTime ? "Checkout" : "Checkin",
            time: (att.checkOutTime || att.checkInTime)
                ? new Date(att.checkOutTime || att.checkInTime!).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Asia/Jakarta"
                })
                : "-",
            status: att.status === "late" ? "warning" : "success",
        }));

        return NextResponse.json({
            status_code: 200,
            message: "Admin attendance data retrieved successfully",
            data: {
                date: targetDate.toISOString().split("T")[0],
                attendance: formattedAttendance,
                absentUsers: absentUsers.map((u) => ({
                    id: u.id,
                    employee: u.name || u.email,
                    email: u.email,
                    status: "absent",
                })),
                stats: {
                    totalEmployees: totalUsers,
                    presentToday: presentCount,
                    lateToday: lateCount,
                    absentToday: absentCount,
                    attendanceRate: totalUsers > 0 ? Math.round((presentCount / totalUsers) * 100) : 0,
                },
                recentActivities,
            },
        });
    } catch (error) {
        console.error("💥 [ADMIN ATTENDANCE] Error:", error);
        return NextResponse.json({ message: "Terjadi kesalahan server" }, { status: 500 });
    }
}
