import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth.config";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    let userId = session?.user?.id;
    const body = await request.json();

    if (!userId && body.userId) {
      userId = body.userId;
    }

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized - Please login first" }, { status: 401 });
    }

    const { type, latitude, longitude, timestamp } = body;

    if (!type || !latitude || !longitude || !timestamp) {
      return NextResponse.json({ message: "Type, latitude, longitude, and timestamp are required" }, { status: 400 });
    }

    if (!["checkin", "checkout"].includes(type)) {
      return NextResponse.json({ message: "Invalid attendance type. Must be 'checkin' or 'checkout'" }, { status: 400 });
    }

    const { getTodayWIB, getTomorrowWIB } = await import("@/lib/date");

    const todayWIB = getTodayWIB();
    const tomorrowWIB = getTomorrowWIB();


    const attendanceDate = new Date(timestamp);


    let existingAttendance = await prisma.attendance.findFirst({
      where: {
        userId,
        date: {
          gte: todayWIB,
          lt: tomorrowWIB,
        },
      },
    });

    if (type === "checkin") {
      if (existingAttendance?.checkInTime) {
        return NextResponse.json({ message: "Anda sudah melakukan absen masuk hari ini" }, { status: 400 });
      }

      if (!existingAttendance) {
        {/* UBAH WAKTU ABSENSI MASUK */ }
        const checkInTime = new Date(timestamp);


        const dateForRecord = todayWIB;

        const lateThreshold = new Date(dateForRecord);
        lateThreshold.setHours(8, 0, 0, 0);

        const status = checkInTime > lateThreshold ? "late" : "present";

        existingAttendance = await prisma.attendance.create({
          data: {
            userId,
            date: dateForRecord,
            checkInTime: checkInTime,
            checkInLatitude: latitude,
            checkInLongitude: longitude,
            status: status,
          },
        });
      } else {
        existingAttendance = await prisma.attendance.update({
          where: { id: existingAttendance.id },
          data: {
            checkInTime: new Date(timestamp),
            checkInLatitude: latitude,
            checkInLongitude: longitude,
          },
        });
      }
    }

    if (type === "checkout") {
      if (!existingAttendance) {
        return NextResponse.json({ message: "Anda belum melakukan absen masuk hari ini" }, { status: 400 });
      }

      if (existingAttendance.checkOutTime) {
        return NextResponse.json({ message: "Anda sudah melakukan absen pulang hari ini" }, { status: 400 });
      }

      {/* HITUNG DURASI KERJA */ }
      const checkOutTime = new Date(timestamp);

      const checkInTime = new Date(existingAttendance.checkInTime as Date);

      const durationMs = checkOutTime.getTime() - checkInTime.getTime();

      {/* 8 jam + 30 detik = (8 * 3600 * 1000) + (30 * 1000) = 28800000 + 30000 = 28830000 ms */ }
      const MIN_DURATION = 28830000;

      if (durationMs < MIN_DURATION) {
        // Calculate remaining time for better UX
        const remainingMs = MIN_DURATION - durationMs;
        const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
        const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

        return NextResponse.json({
          message: `Gagal absen pulang. Minimal kerja 8 jam 30 detik. Kurang waktu: ${remainingHours} jam ${remainingMinutes} menit. kamu harus membayar keterlambatan mu.`
        }, { status: 400 });
      }

      existingAttendance = await prisma.attendance.update({
        where: { id: existingAttendance.id },
        data: {
          checkOutTime: checkOutTime,
          checkOutLatitude: latitude,
          checkOutLongitude: longitude,

        },
      });
    }

    return NextResponse.json(
      {
        status_code: 200,
        message: type === "checkin" ? "Absen masuk berhasil dicatat" : "Absen pulang berhasil dicatat",
        attendance: existingAttendance,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Terjadi kesalahan server" }, { status: 500 });
  }
}
export async function GET(req: NextRequest) {
  try {
    console.log("📅 [GET TODAY ATTENDANCE] Starting...");

    const session = await getServerSession(authOptions);
    console.log("📋 Session:", session);

    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ message: "Authentication required" }, { status: 401 });
    }

    // Use WIB helpers to get the correct "today" range
    const { getTodayWIB, getTomorrowWIB } = await import("@/lib/date");
    const todayWIB = getTodayWIB();
    const tomorrowWIB = getTomorrowWIB();

    const attendance = await prisma.attendance.findFirst({
      where: {
        userId,
        date: {
          gte: todayWIB,
          lt: tomorrowWIB,
        },
      },
    });

    return NextResponse.json({
      status_code: 200,
      message: "Attendance data retrieved successfully",
      attendance,
    });
  } catch (error) {
    console.error("💥 [GET TODAY ATTENDANCE]", error);
    return NextResponse.json({ message: "Terjadi kesalahan server" }, { status: 500 });
  }
}
