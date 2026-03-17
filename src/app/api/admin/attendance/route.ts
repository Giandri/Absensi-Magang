import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth.config";
import { getLocationName, OFFICE_CONFIG } from "@/lib/geocoding";

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

        // Ambil permission untuk tanggal ini
        const permissions = await prisma.permission.findMany({
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
        });

        // User yang tidak hadir (tidak ada record attendance)
        const presentUserIds = attendances.map((a) => a.userId);
        const absentUsersRaw = allUsers.filter((u) => !presentUserIds.includes(u.id));
        
        // Map absent users dengan info permission
        const absentUsers = absentUsersRaw.map((u) => {
            const userPermission = permissions.find((p) => p.userId === u.id);
            return {
                id: u.id,
                employee: u.name || u.email,
                email: u.email,
                status: userPermission ? "permission" : "absent",
                permissionType: userPermission?.type || null,
                permissionNote: userPermission?.note || null,
                permissionStatus: userPermission?.status || null,
            };
        });
        
        const absentCount = absentUsers.filter((u) => u.status === "absent").length;
        const permissionCount = absentUsers.filter((u) => u.status === "permission").length;

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
                absentUsers: absentUsers,
                stats: {
                    totalEmployees: totalUsers,
                    presentToday: presentCount,
                    lateToday: lateCount,
                    absentToday: absentCount,
                    permissionToday: permissionCount,
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

export async function POST(request: NextRequest) {

    try {
        console.log("📝 [ADMIN ATTENDANCE] Creating manual entry...");
        
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        let { userId, date, checkInTime, checkOutTime, notes } = body;

        // If not admin, prevent manual attendance
        if (session.user.role !== "admin") {
            return NextResponse.json(
                { message: "Absen manual dinonaktifkan sementara. Silakan hubungi admin jika ada kendala." }, 
                { status: 403 }
            );
        }

        // Admin can still perform manual actions
        if (session.user.role !== "admin") {
            userId = session.user.id;
        }

        if (!userId || !date || (!checkInTime && !checkOutTime)) {
            return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
        }


        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (targetDate > today) {
            return NextResponse.json({ message: "Tidak bisa membuat absensi untuk tanggal mendatang" }, { status: 400 });
        }


        const checkInDate = checkInTime ? new Date(checkInTime) : null;
        const checkOutDate = checkOutTime ? new Date(checkOutTime) : null;

        // Cek jika sudah ada absen di hari tersebut
        const existingAttendance = await prisma.attendance.findFirst({
            where: {
                userId,
                date: {
                    gte: targetDate,
                    lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000),
                },
            },
        });

        if (existingAttendance) {
            // Jika sudah ada absen, dan user memberikan checkOutTime tapi record lama null, UPDATE saja
            if (checkOutDate && !existingAttendance.checkOutTime) {
                console.log("🔄 [ADMIN ATTENDANCE] Updating missing check-out for existing record...");
                const updated = await prisma.attendance.update({
                    where: { id: existingAttendance.id },
                    data: {
                        checkOutTime: checkOutDate,
                        notes: notes || existingAttendance.notes || "Manual check-out update",
                    },
                });
                return NextResponse.json({
                    status_code: 200,
                    message: "Attendance updated with check-out time",
                    data: updated,
                });
            }
            return NextResponse.json({ message: "Absen sudah ada untuk tanggal ini" }, { status: 400 });
        }

        if (!checkInDate) {
            return NextResponse.json({ message: "Check-in time is required for new entries" }, { status: 400 });
        }

        // Tentukan status (default: jika lewat jam 8:00 dianggap terlambat)
        const eightAm = new Date(checkInDate);
        eightAm.setHours(8, 0, 0, 0);
        const status = checkInDate > eightAm ? "late" : "present";

        const attendance = await prisma.attendance.create({
            data: {
                userId,
                date: targetDate,
                checkInTime: checkInDate,
                checkOutTime: checkOutDate,
                status,
                notes: notes || "Manual entry",
                checkInLatitude: OFFICE_CONFIG.latitude,
                checkInLongitude: OFFICE_CONFIG.longitude,
            },
        });

        return NextResponse.json({
            status_code: 201,
            message: "Attendance created successfully",
            data: attendance,
        });
    } catch (error) {
        console.error("💥 [ADMIN ATTENDANCE] POST Error:", error);
        return NextResponse.json({ message: "Terjadi kesalahan server" }, { status: 500 });
    }
}

