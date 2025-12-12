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

    // Force server time to track "today" in WIB context
    // This prevents users from changing device time to bypass daily checks
    // However, we respect the "timestamp" passed for the exact precision if desired, 
    // OR we override it with calculate server time to be safe. 
    // For now, let's use the explicit WIB helpers for the *Range Check*.
    const { getTodayWIB, getTomorrowWIB } = await import("@/lib/date");

    const todayWIB = getTodayWIB();
    const tomorrowWIB = getTomorrowWIB();

    // Use the explicit timestamp provided by client for the record itself (if we trust client)
    // or clamp it? Let's use it as is for the specific log, but validate against "today" using WIB.
    const attendanceDate = new Date(timestamp);

    // Ensure accurate day check
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

        // Use todayWIB for the "Date" column (normalized 00:00) to ensure uniqueness per day
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

      existingAttendance = await prisma.attendance.update({
        where: { id: existingAttendance.id },
        data: {
          checkOutTime: new Date(timestamp),
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
