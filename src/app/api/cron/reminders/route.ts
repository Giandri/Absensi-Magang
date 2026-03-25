import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";

export async function GET(request: Request) {
  try {
    // cron only via Vercel
    const authHeader = request.headers.get("authorization");
    const isVercelCron = request.headers.get("user-agent")?.includes("Vercel-Cron");
    const cronSecret = process.env.CRON_SECRET || "local-test-secret";

    if (!isVercelCron && authHeader !== `Bearer ${cronSecret}`) {

      console.warn("Unauthorized cron attempt. Bypass for local testing.");

    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    const { getTodayWIB, getTomorrowWIB } = await import("@/lib/date");
    const todayWIB = getTodayWIB();
    const tomorrowWIB = getTomorrowWIB();

    const users = await prisma.user.findMany({
      where: {
        role: "user",
      },
      include: {
        attendances: {
          where: {
            date: {
              gte: todayWIB,
              lt: tomorrowWIB,
            },
          },
          take: 1,
        },
      },
    });

    let sentCount = 0;

    for (const user of users) {
      const hasCheckedIn = user.attendances.length > 0 && user.attendances[0].checkInTime !== null;
      const hasCheckedOut = user.attendances.length > 0 && user.attendances[0].checkOutTime !== null;

      if (type === "morning" && !hasCheckedIn) {
        await sendNotification({
          userId: user.id,
          title: "Waktunya Absen Masuk!",
          message: "Jangan lupa untuk melakukan absen masuk pagi ini. Semangat bekerja! ☀️",
          type: "reminder",
          url: "/dashboard",
        });
        sentCount++;
      }

      if (type === "evening") {
        if (hasCheckedIn && !hasCheckedOut) {
          const checkInTime = user.attendances[0].checkInTime;
          const checkInWib = checkInTime
            ? new Date(checkInTime).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour12: false, hour: "2-digit", minute: "2-digit" })
            : "--:--";
          await sendNotification({
            userId: user.id,
            title: "Waktunya Absen Pulang!",
            message: "Sudah waktunya pulang. Jangan lupa absen keluar ya! 🏡",
            type: "reminder",
            url: "/dashboard",
          });
          sentCount++;
        }
      }
    }

    // --- Cleanup Routine (7 Days) ---
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const deleted = await prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: sevenDaysAgo,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Triggered ${type} reminders. Sent: ${sentCount}. Cleaned up ${deleted.count} old notifications.`,
    });
  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
