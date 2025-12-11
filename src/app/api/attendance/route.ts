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

    const attendanceDate = new Date(timestamp);
    attendanceDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let existingAttendance = await prisma.attendance.findFirst({
      where: {
        userId,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
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
        const lateThreshold = new Date(attendanceDate);
        lateThreshold.setHours(8, 0, 0, 0);

        const status = checkInTime > lateThreshold ? "late" : "present";

        existingAttendance = await prisma.attendance.create({
          data: {
            userId,
            date: attendanceDate,
            checkInTime: new Date(timestamp),
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const attendance = await prisma.attendance.findFirst({
      where: {
        userId,
        date: {
          gte: today,
          lt: tomorrow,
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
