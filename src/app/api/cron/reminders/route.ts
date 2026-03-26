import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";
import { fetchHolidays, isHoliday } from "@/lib/holiday";

export async function GET(request: Request) {
  try {
    // Auth: cron only via Vercel or with secret
    const authHeader = request.headers.get("authorization");
    const isVercelCron = request.headers
      .get("user-agent")
      ?.includes("Vercel-Cron");
    const cronSecret = process.env.CRON_SECRET || "local-test-secret";

    if (!isVercelCron && authHeader !== `Bearer ${cronSecret}`) {
      console.warn("Unauthorized cron attempt. Bypass for local testing.");
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    const { getTodayWIB, getTomorrowWIB } = await import("@/lib/date");
    const todayWIB = getTodayWIB();
    const tomorrowWIB = getTomorrowWIB();

    // Check if today is a weekend (Saturday/Sunday in WIB)
    const nowWIB = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
    );
    const dayOfWeek = nowWIB.getDay(); // 0=Sun, 6=Sat
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return NextResponse.json({
        success: true,
        message: "Skipped: Weekend — no reminders sent.",
      });
    }

    // Check if today is a holiday using the external API
    const year = nowWIB.getFullYear();
    const holidays = await fetchHolidays(year);
    const todayStr = `${year}-${String(nowWIB.getMonth() + 1).padStart(2, "0")}-${String(nowWIB.getDate()).padStart(2, "0")}`;
    const todayHoliday = isHoliday(todayStr, holidays);

    if (todayHoliday) {
      return NextResponse.json({
        success: true,
        message: `Skipped: Holiday (${todayHoliday.name}) — no reminders sent.`,
      });
    }

    // Fetch all active users with today's attendance and permissions
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
        permissions: {
          where: {
            date: {
              gte: todayWIB,
              lt: tomorrowWIB,
            },
            status: "approved",
          },
          take: 1,
        },
      },
    });

    let sentCount = 0;

    for (const user of users) {
      // Skip users who have approved permission/leave today
      if (user.permissions.length > 0) continue;

      const hasCheckedIn =
        user.attendances.length > 0 &&
        user.attendances[0].checkInTime !== null;
      const hasCheckedOut =
        user.attendances.length > 0 &&
        user.attendances[0].checkOutTime !== null;

      if (type === "morning" && !hasCheckedIn) {
        await sendNotification({
          userId: user.id,
          title: "🔔 Pengingat Absen Masuk",
          message: `Halo ${user.name || "Peserta Magang"}, jangan lupa absen masuk hari ini ya! Semangat bekerja! ☀️`,
          type: "reminder",
          url: "/dashboard",
        });
        sentCount++;
      }

      if (type === "evening" && hasCheckedIn && !hasCheckedOut) {
        await sendNotification({
          userId: user.id,
          title: "🔔 Pengingat Absen Pulang",
          message: `Halo ${user.name || "Peserta Magang"}, sudah waktunya pulang. Jangan lupa absen keluar ya! 🏡`,
          type: "reminder",
          url: "/dashboard",
        });
        sentCount++;
      }
    }

    // --- Cleanup: Delete notifications older than 7 days ---
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
