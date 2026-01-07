import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth.config";
import bcrypt from "bcryptjs";

export async function GET(request: NextRequest) {
  try {
    // TEMPORARILY DISABLE AUTH FOR DEBUGGING
    // const session = await getServerSession(authOptions);
    // if (!session?.user?.role || session.user.role !== "admin") {
    //   return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    // }

    const users = await prisma.user.findMany({
      where: { role: "user" }, // Only get regular users, not admins
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      status_code: 200,
      data: users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

// TEMPORARY PUT ENDPOINT FOR TESTING - REMOVE AFTER FIX
export async function PUT(request: NextRequest) {
  try {
    console.log("🔄 [TEMP PUT] Starting update...");

    const { id, name, email, phone, address, password } = await request.json();
    console.log("📝 [TEMP PUT] Received data:", { id, name, email, phone: phone ? "***" : null, address, hasPassword: !!password });

    // Validate required fields
    if (!id || !name || !email) {
      return NextResponse.json({
        message: "ID, name and email are required"
      }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
      }
    });

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
      where: { id },
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

    console.log("✅ [TEMP PUT] User updated successfully:", updatedUser.email);

    return NextResponse.json({
      status_code: 200,
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("💥 [TEMP PUT] Error:", error);
    return NextResponse.json({
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { name, email, phone, address, password } = await request.json();

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json({
        message: "Name, email, and password are required"
      }, { status: 400 });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({
        message: "Email already exists"
      }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        address,
        password: hashedPassword,
        role: "user",
      },
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
      status_code: 201,
      message: "User created successfully",
      data: newUser,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

