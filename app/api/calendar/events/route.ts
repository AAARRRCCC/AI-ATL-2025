import { NextRequest, NextResponse } from "next/server";
import { extractTokenFromHeader, verifyToken } from "@/lib/auth";
import { getCalendarEvents } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  try {
    // Authenticate with JWT
    const authHeader = request.headers.get("authorization");
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 }
      );
    }

    const events = await getCalendarEvents(
      payload.userId,
      new Date(startDate),
      new Date(endDate)
    );

    return NextResponse.json({ events });
  } catch (error) {
    console.error("Calendar events error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch calendar events";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
