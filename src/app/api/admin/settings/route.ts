import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Fetch global setting + all users with canManualAttendance
export async function GET() {
  try {
    // Get or create global setting
    let setting = await prisma.systemSetting.findUnique({
      where: { id: "global" },
    });

    if (!setting) {
      setting = await prisma.systemSetting.create({
        data: { id: "global", allowManualAttendance: false },
      });
    }

    // Get all users
    const users = await prisma.user.findMany({
      where: { role: "user" },
      select: {
        id: true,
        name: true,
        email: true,
        canManualAttendance: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: {
        allowManualAttendance: setting.allowManualAttendance,
        users,
      },
    });
  } catch (error) {
    console.error("[SETTINGS_GET_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}

// PUT - Update global toggle OR per-user toggle
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    // Case 1: Toggle global setting
    if (typeof body.allowManualAttendance === "boolean") {
      const setting = await prisma.systemSetting.upsert({
        where: { id: "global" },
        update: { allowManualAttendance: body.allowManualAttendance },
        create: { id: "global", allowManualAttendance: body.allowManualAttendance },
      });

      return NextResponse.json({
        success: true,
        data: setting,
        message: setting.allowManualAttendance
          ? "Fitur absen manual diaktifkan"
          : "Fitur absen manual dinonaktifkan",
      });
    }

    // Case 2: Toggle per-user
    if (body.userId && typeof body.canManualAttendance === "boolean") {
      const updatedUser = await prisma.user.update({
        where: { id: body.userId },
        data: { canManualAttendance: body.canManualAttendance },
        select: { id: true, name: true, email: true, canManualAttendance: true },
      });

      return NextResponse.json({
        success: true,
        data: updatedUser,
        message: updatedUser.canManualAttendance
          ? `${updatedUser.name || updatedUser.email} diizinkan absen manual`
          : `${updatedUser.name || updatedUser.email} tidak diizinkan absen manual`,
      });
    }

    return NextResponse.json(
      { success: false, message: "Parameter tidak valid" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[SETTINGS_PUT_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan saat menyimpan" },
      { status: 500 }
    );
  }
}
