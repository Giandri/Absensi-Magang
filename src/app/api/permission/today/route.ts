import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth.config";

// GET - Cek apakah user sudah mengajukan izin/sakit/libur hari ini
export async function GET(req: NextRequest) {
    try {
        console.log("📅 [GET TODAY PERMISSION] Starting...");

        const session = await getServerSession(authOptions);
        let userId: string | undefined = session?.user?.id;

        // Fallback ke query parameter
        if (!userId) {
            const { searchParams } = new URL(req.url);
            userId = searchParams.get("userId") || undefined;
        }

        if (!userId) {
            return NextResponse.json({ message: "Authentication required" }, { status: 401 });
        }

        // Tanggal hari ini
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        // Cari permission hari ini
        const permission = await prisma.permission.findFirst({
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
            message: "Today permission data retrieved successfully",
            hasPermission: !!permission,
            permission: permission || null,
        });
    } catch (error) {
        console.error("💥 [GET TODAY PERMISSION] Error:", error);
        return NextResponse.json({ message: "Terjadi kesalahan server" }, { status: 500 });
    }
}
