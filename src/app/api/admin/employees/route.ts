import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth.config";

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);



        const employees = await prisma.user.findMany({
            where: {
                role: "user",
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                address: true,
                createdAt: true,
            },
            orderBy: {
                name: "asc",
            },
        });

        return NextResponse.json({
            status_code: 200,
            message: "Employees data retrieved successfully",
            data: employees,
        });
    } catch (error) {
        console.error("Error fetching employees:", error);
        return NextResponse.json(
            { message: "Terjadi kesalahan server saat mengambil data karyawan" },
            { status: 500 }
        );
    }
}
