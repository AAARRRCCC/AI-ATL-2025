import { NextRequest, NextResponse } from "next/server";
import { extractTokenFromHeader, verifyToken } from "@/lib/auth";
import { updateCalendarEvent } from "@/lib/google-calendar";

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { eventId, startTime, endTime } = body;

    if (!eventId || !startTime || !endTime) {
      return NextResponse.json(
        { error: "eventId, startTime, and endTime are required" },
        { status: 400 }
      );
    }

    const event = await updateCalendarEvent(
      payload.userId,
      eventId,
      new Date(startTime),
      new Date(endTime)
    );

    return NextResponse.json({ event });
  } catch (error) {
    console.error("Update event error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to update calendar event";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
