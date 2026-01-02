import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchHolidaysForRange, getDayStatus } from "@/lib/holiday";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const userId = searchParams.get("userId") || undefined;
    const format = searchParams.get("format") || "json";

    if (!start || !end) {
      return NextResponse.json({ message: "Parameter start dan end wajib diisi" }, { status: 400 });
    }

    // Parse dates as UTC to avoid timezone issues
    const startDate = new Date(start + "T00:00:00.000Z");
    const endDate = new Date(end + "T23:59:59.999Z");

    // Fetch holidays for the date range
    const holidays = await fetchHolidaysForRange(startDate, endDate);

    const users = await prisma.user.findMany({
      where: { role: "user", ...(userId ? { id: userId } : {}) },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });

    const [attendances, permissions] = await Promise.all([
      prisma.attendance.findMany({
        where: { date: { gte: startDate, lte: endDate }, ...(userId ? { userId } : {}) },
      }),
      prisma.permission.findMany({
        where: { date: { gte: startDate, lte: endDate }, ...(userId ? { userId } : {}) },
      }),
    ]);

    const dayKey = (d: Date) => d.toISOString().split("T")[0];

    // Index data
    const attMap = new Map<string, (typeof attendances)[0]>();
    attendances.forEach((a) => attMap.set(`${a.userId}-${dayKey(a.date)}`, a));

    const permMap = new Map<string, (typeof permissions)[0]>();
    permissions.forEach((p) => permMap.set(`${p.userId}-${dayKey(p.date)}`, p));

    const detail: {
      userId: string;
      name: string;
      email: string;
      date: string;
      status: string;
      checkIn: string | null;
      checkOut: string | null;
      workHours: string;
      permissionType: string | null;
      permissionStatus: string | null;
      notes: string;
      dayType: "holiday" | "weekend" | "workday";
      holidayName: string | null;
    }[] = [];

    // Generate all dates in range using UTC
    const dates: { dateStr: string; date: Date }[] = [];
    for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
      dates.push({ dateStr: dayKey(d), date: new Date(d) });
    }

    users.forEach((u) => {
      dates.forEach(({ dateStr, date }) => {
        const key = `${u.id}-${dateStr}`;
        const att = attMap.get(key);
        const perm = permMap.get(key);

        // Get day status (holiday/weekend/workday)
        const dayStatus = getDayStatus(date, holidays);

        let status = "absent";
        let checkIn: string | null = null;
        let checkOut: string | null = null;
        let workHours = "0j 0m";
        let permissionType: string | null = null;
        let permissionStatus: string | null = null;
        let notes = "";

        // If it's a holiday or weekend and no attendance, mark as holiday/weekend
        if (dayStatus.type === "holiday" || dayStatus.type === "weekend") {
          if (!att) {
            status = dayStatus.type;
            notes = dayStatus.holidayName || "";
          }
        }

        if (att) {
          status = att.status;
          checkIn = att.checkInTime
            ? new Date(att.checkInTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })
            : null;
          checkOut = att.checkOutTime
            ? new Date(att.checkOutTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })
            : null;

          if (att.checkInTime && att.checkOutTime) {
            const diff = new Date(att.checkOutTime).getTime() - new Date(att.checkInTime).getTime();
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            workHours = `${h}j ${m}m`;
          }
          notes = att.notes || "";
        } else if (perm) {
          status = "permission";
          permissionType = perm.type;
          permissionStatus = perm.status;
          notes = perm.note || "";
        }

        detail.push({
          userId: u.id,
          name: u.name || u.email,
          email: u.email,
          date: dateStr,
          status,
          checkIn,
          checkOut,
          workHours,
          permissionType,
          permissionStatus,
          notes,
          dayType: dayStatus.type,
          holidayName: dayStatus.holidayName,
        });
      });
    });

    // Summary per user
    const summary = users.map((u) => {
      const rows = detail.filter((r) => r.userId === u.id);
      let present = 0,
        late = 0,
        permission = 0,
        absent = 0,
        holiday = 0,
        weekend = 0,
        totalMinutes = 0;

      rows.forEach((r) => {
        if (r.status === "present") present++;
        else if (r.status === "late") late++;
        else if (r.status === "permission") permission++;
        else if (r.status === "holiday") holiday++;
        else if (r.status === "weekend") weekend++;
        else absent++;

        // Parse work hours
        const match = r.workHours.match(/(\d+)j\s*(\d+)m/);
        if (match) {
          totalMinutes += parseInt(match[1]) * 60 + parseInt(match[2]);
        }
      });

      const totalHours = Math.floor(totalMinutes / 60);
      const totalMins = totalMinutes % 60;

      return {
        userId: u.id,
        name: u.name || u.email,
        email: u.email,
        present,
        late,
        permission,
        absent,
        holiday,
        weekend,
        totalWorkHours: `${totalHours}j ${totalMins}m`,
      };
    });

    if (format === "csv") {
      const headers = ["Nama", "Email", "Tanggal", "Status", "Jam Masuk", "Jam Keluar", "Jam Kerja", "Tipe Izin", "Status Izin", "Keterangan Libur", "Catatan"];
      const csv = [
        headers.join(","),
        ...detail.map((r) => {
          let statusText = r.status;
          if (r.status === "holiday") statusText = "Libur Nasional";
          else if (r.status === "weekend") statusText = "Akhir Pekan";

          let permStatusText = "-";
          if (r.permissionStatus === "approved") permStatusText = "Disetujui";
          else if (r.permissionStatus === "pending") permStatusText = "Menunggu";
          else if (r.permissionStatus === "rejected") permStatusText = "Ditolak";

          return [
            r.name,
            r.email,
            r.date,
            statusText,
            r.checkIn || "-",
            r.checkOut || "-",
            r.workHours,
            r.permissionType || "-",
            permStatusText,
            r.holidayName || "-",
            r.notes || "-",
          ]
            .map((v) => `"${v.toString().replace(/"/g, '""')}"`)
            .join(",");
        }),
      ].join("\n");

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="rekap-absen-${start}-${end}.csv"`,
        },
      });
    }

    return NextResponse.json({
      status_code: 200,
      data: { summary, detail, dateRange: { start, end }, totalDays: dates.length, holidays },
    });
  } catch (error) {
    console.error("💥 [REKAP] Error:", error);
    return NextResponse.json({ message: "Terjadi kesalahan server" }, { status: 500 });
  }
}
