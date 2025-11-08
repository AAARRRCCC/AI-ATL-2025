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
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "start_date and end_date are required" },
        { status: 400 }
      );
    }

    const events = await getCalendarEvents(
      payload.userId,
      new Date(startDate),
      new Date(endDate)
    );

    return NextResponse.json({
      success: true,
      events: events.map((event) => ({
        id: event.id,
        title: event.summary || "Untitled",
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        description: event.description || "",
        location: event.location || "",
      })),
    });
  } catch (error: any) {
    console.error("Calendar events error:", error.message);

    // Check if it's a "not connected" error
    if (error.message?.includes("not connected")) {
      return NextResponse.json({
        success: false,
        events: [],
        error: "Google Calendar not connected",
      });
    }

    return NextResponse.json(
      { error: "Failed to fetch calendar events" },
      { status: 500 }
    );
  }
}
