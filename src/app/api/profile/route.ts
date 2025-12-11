import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth.config"
import { prisma } from "@/lib/prisma"

// GET /api/profile - Mengambil data profil user yang login
export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        console.log("📋 Profile API - Session:", JSON.stringify(session, null, 2))

        if (!session?.user?.id) {
            console.log("❌ Profile API - No session or user.id found")
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            )
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                address: true,
                role: true,
                createdAt: true,
            }
        })

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            )
        }

        return NextResponse.json({ success: true, data: user })
    } catch (error) {
        console.error("Error fetching profile:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}

// PUT /api/profile - Update data profil user
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        console.log("📋 Profile PUT API - Session:", JSON.stringify(session, null, 2))

        if (!session?.user?.id) {
            console.log("❌ Profile PUT API - No session or user.id found")
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            )
        }

        const { name, phone, address } = await request.json()

        const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data: {
                name: name || undefined,
                phone: phone || undefined,
                address: address || undefined,
            },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                address: true,
                role: true,
                createdAt: true,
            }
        })

        return NextResponse.json({
            success: true,
            message: "Profile updated successfully",
            data: updatedUser
        })
    } catch (error) {
        console.error("Error updating profile:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
