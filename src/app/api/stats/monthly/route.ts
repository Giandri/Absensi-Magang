import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    // Count present days this month
    const presentCount = await prisma.attendance.count({
      where: {
        userId,
        date: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth,
        },
        checkInTime: { not: null },
      },
    });

    // Count permissions this month
    const permissionCount = await prisma.permission.count({
      where: {
        userId,
        type: { in: ["izin", "sakit"] },
        date: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth,
        },
      },
    });

    // Max quota is 3 per month
    const remainingQuota = Math.max(0, 3 - permissionCount);

    return NextResponse.json({
      presentCount,
      permissionCount,
      remainingQuota,
      month: today.toLocaleString('default', { month: 'long' }),
      year: today.getFullYear()
    });
  } catch (error) {
    console.error("Monthly Stats Error:", error);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}
