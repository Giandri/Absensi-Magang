import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendNotification } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
    }

    const body = await req.json();
    const { userId, title, message } = body;

    if (!userId || !title || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const notification = await sendNotification({
        userId,
        title,
        message,
        type: "info",
        url: "/dashboard", 
      });

    if (notification) {
      return NextResponse.json({ success: true, message: "Pesan berhasil dikirim via Push Notifikasi." });
    } else {
        return NextResponse.json({ error: "Gagal mengirim notifikasi. User mungkin belum mengaktifkan atau berlangganan push notif." }, { status: 400 });
    }

  } catch (error: any) {
    console.error("Error sending admin message:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
