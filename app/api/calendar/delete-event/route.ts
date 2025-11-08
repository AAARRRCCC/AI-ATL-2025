import { NextRequest, NextResponse } from "next/server";
import { extractTokenFromHeader, verifyToken } from "@/lib/auth";
import { deleteCalendarEvent } from "@/lib/google-calendar";

export async function DELETE(request: NextRequest) {
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
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json(
        { error: "eventId is required" },
        { status: 400 }
      );
    }

    await deleteCalendarEvent(payload.userId, eventId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete event error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to delete calendar event";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
