import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth.config";
import { prisma } from "@/lib/prisma";

// GET - Ambil hanya nama, email, dan nomor HP
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    console.log("🔍 Session data:", session); // Log session buat cek apa isinya

    if (!session || !session.user?.email) {
      console.log("🚫 No session or email");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("📧 Email dari session:", session.user.email); // Cek emailnya apa

    // Ambil HANYA nama, email, dan phone
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        name: true,
        email: true,
        phone: true,
      },
    });

    if (!user) {
      console.log("❓ User not found with email:", session.user.email);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("✅ Profile fetched:", user);

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("❌ Error fetching profile:", error); // Ini udah ada, bagus
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 }); // Tambah details biar tau error apa
  }
}

// PUT - Update hanya nama dan nomor HP
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone } = body;

    // Update hanya field yang dikirim
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
      },
      select: {
        name: true,
        email: true,
        phone: true,
      },
    });

    console.log("✅ Profile updated:", updatedUser);

    return NextResponse.json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    console.error("❌ Error updating profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
