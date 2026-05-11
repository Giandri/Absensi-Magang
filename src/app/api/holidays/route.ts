import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year") || new Date().getFullYear();

  try {
    const response = await fetch(
      `https://tanggalmerah.upset.dev/api/holidays?year=${year}`,
      { next: { revalidate: 86400 } } // Cache 24 jam
    );

    if (!response.ok) {
      return NextResponse.json(
        { status: "error", message: `API responded with status: ${response.status}` },
        { status: response.status }
      );
    }

    const result = await response.json();

    // API returns { success, data: [{ date, day, name, type }], meta }
    // Normalize ke format yang dipakai frontend
    const holidays = (result.data || []).map((h: any) => ({
      date: h.date,
      name: h.name,
      is_national_holiday: h.type === "holiday",
      type: h.type, // "holiday" atau "leave" (cuti bersama)
      day: h.day,
    }));

    return NextResponse.json({ status: "success", data: holidays });
  } catch (error) {
    console.error("Holiday API Proxy Error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to fetch holidays" },
      { status: 500 }
    );
  }
}
