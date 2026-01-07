import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth.config";
import bcrypt from "bcryptjs";

// TEMPORARY TEST ENDPOINT - REMOVE AUTH FOR DEBUGGING
export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  const { userId } = params;
  console.log("🔍 [TEST] Raw params:", params);
  console.log("🔍 [TEST] userId:", userId, "type:", typeof userId, "length:", userId?.length);

  return NextResponse.json({
    message: "Test endpoint",
    userId,
    type: typeof userId,
    length: userId?.length,
    params
  });
}

export async function PUT(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    // TEMPORARILY DISABLE AUTH FOR DEBUGGING
    // const session = await getServerSession(authOptions);
    // if (!session?.user?.role || session.user.role !== "admin") {
    //   return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    // }

    const { userId } = params;
    console.log("🔍 [DEBUG] Raw params:", params);
    console.log("🔍 [DEBUG] userId:", userId, "type:", typeof userId, "length:", userId?.length);

    // More lenient validation - just check if it exists
    if (!userId) {
      console.log("❌ [UPDATE USER] userId is missing");
      return NextResponse.json({
        message: "User ID is required",
        debug: { userId, params }
      }, { status: 400 });
    }

    const { name, email, phone, address, password } = await request.json();

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json({
        message: "Name and email are required"
      }, { status: 400 });
    }

    // Check if user exists with error handling
    let existingUser;
    try {
      existingUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
        }
      });
    } catch (findError) {
      console.error("💥 [UPDATE USER] findUnique error:", findError);
      // Try alternative approach
      const users = await prisma.user.findMany({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
        },
        take: 1
      });
      existingUser = users[0] || null;
    }

    if (!existingUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Check if new email is already taken by another user
    if (email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        return NextResponse.json({
          message: "Email already exists"
        }, { status: 400 });
      }
    }

    // Prepare update data
    const updateData: any = {
      name,
      email,
      phone,
      address,
    };

    // Only update password if provided
    if (password && password.trim() !== "") {
      updateData.password = await bcrypt.hash(password, 12);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      status_code: 200,
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    // Check if user is admin
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { userId } = params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!existingUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Prevent deleting admin users
    if (existingUser.role === "admin") {
      return NextResponse.json({
        message: "Cannot delete admin user"
      }, { status: 403 });
    }

    // Delete user's attendances and permissions first (due to foreign key constraints)
    await prisma.attendance.deleteMany({
      where: { userId },
    });

    await prisma.permission.deleteMany({
      where: { userId },
    });

    // Delete the user
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      status_code: 200,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}