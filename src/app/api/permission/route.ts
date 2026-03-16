import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    console.log("🚀 POST /api/permission");

    const session = await getServerSession(authOptions);
    const body = await req.json();

    console.log("Session:", session);
    console.log("Body:", body);

    // Prioritas: session > body.userId > first user
    let userId = session?.user?.id || body.userId;

    if (!userId) {
      const firstUser = await prisma.user.findFirst();
      userId = firstUser?.id;
      console.log("⚠️ Using first user from DB:", userId);
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, note } = body;

    if (!["izin", "sakit", "libur"].includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    if (type === "izin" && !note?.trim()) {
      return NextResponse.json({ error: "Note required for izin" }, { status: 400 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Quota check for 'izin' and 'sakit'
    if (["izin", "sakit"].includes(type)) {
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

      const usageCount = await prisma.permission.count({
        where: {
          userId,
          type: { in: ["izin", "sakit"] },
          date: {
            gte: firstDayOfMonth,
            lte: lastDayOfMonth,
          },
        },
      });

      if (usageCount >= 3) {
        return NextResponse.json({ 
          error: "Batas maksimal izin/sakit bulan ini (3x) telah tercapai." 
        }, { status: 400 });
      }
    }

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);


    const existing = await prisma.permission.findFirst({
      where: { userId, date: { gte: today, lt: tomorrow } },
    });

    if (existing) {
      return NextResponse.json({ error: "Kamu telah mengisi keterangan sebelumnya!" }, { status: 400 });
    }

    const permission = await prisma.permission.create({
      data: {
        userId,
        type,
        note: note?.trim() || null,
        date: today,
        status: "Approved",
      },
    });

    console.log("✅ Created:", permission.id);

    return NextResponse.json({ success: true, message: "Izin berhasil diajukan", data: permission }, { status: 201 });
  } catch (error: any) {
    console.error("❌ Error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    let userId = session?.user?.id;

    if (!userId) {
      const firstUser = await prisma.user.findFirst();
      userId = firstUser?.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const permissions = await prisma.permission.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 50,
    });

    return NextResponse.json({ success: true, data: permissions });
  } catch (error: any) {
    console.error("❌ GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

