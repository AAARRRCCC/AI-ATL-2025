import { NextRequest, NextResponse } from "next/server";
import { extractTokenFromHeader, verifyToken } from "@/lib/auth";
import { createStudyEvent, createCalendarEvent, isTimeSlotAvailable } from "@/lib/google-calendar";

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
    const { title, description, startTime, endTime, taskId, isStudyAutopilot } = body;

    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { error: "title, startTime, and endTime are required" },
        { status: 400 }
      );
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    // Check if time slot is available (optional - skip for manual events if checkConflict is false)
    const checkConflict = body.checkConflict !== false; // Default to true
    if (checkConflict) {
      const isAvailable = await isTimeSlotAvailable(payload.userId, start, end);

      if (!isAvailable) {
        return NextResponse.json(
          { error: "Time slot conflicts with existing event" },
          { status: 409 }
        );
      }
    }

    // Use appropriate creation function based on event type
    const event = isStudyAutopilot
      ? await createStudyEvent(
          payload.userId,
          title,
          description || "",
          start,
          end,
          taskId
        )
      : await createCalendarEvent(
          payload.userId,
          title,
          description || "",
          start,
          end
        );

    return NextResponse.json({ event });
  } catch (error) {
    console.error("Create event error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create calendar event";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
