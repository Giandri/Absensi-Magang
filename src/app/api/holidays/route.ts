import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year") || new Date().getFullYear();

  try {
    const response = await fetch(`https://libur.deno.dev/api?year=${year}`);
    
    if (!response.ok) {
      return NextResponse.json(
        { status: "error", message: `External API responded with status: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    // Wrap in success for backward compatibility with our frontend logic
    return NextResponse.json({ status: "success", data });
  } catch (error) {
    console.error("Holiday API Proxy Error:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to fetch holidays from external source" },
      { status: 500 }
    );
  }
}

