import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth.config";

export async function GET(req: NextRequest) {
  try {
    console.log("📅 [GET TODAY ATTENDANCE] Starting...");

    const session = await getServerSession(authOptions);
    console.log("📋 Session:", session);

    let userId: string | undefined = session?.user?.id;

    if (!userId) {
      const { searchParams } = new URL(req.url);
      userId = searchParams.get("userId") || undefined;
      console.log("📋 Using userId from query:", userId);
    }

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
