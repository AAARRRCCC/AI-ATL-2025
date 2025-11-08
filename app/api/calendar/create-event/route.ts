import { NextRequest, NextResponse } from "next/server";
import { extractTokenFromHeader, verifyToken } from "@/lib/auth";
import { createStudyEvent, isTimeSlotAvailable } from "@/lib/google-calendar";

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
    const { title, description, startTime, endTime, taskId } = body;

    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { error: "title, startTime, and endTime are required" },
        { status: 400 }
      );
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    // Check if time slot is available
    const isAvailable = await isTimeSlotAvailable(payload.userId, start, end);

    if (!isAvailable) {
      return NextResponse.json(
        { error: "Time slot conflicts with existing event" },
        { status: 409 }
      );
    }

    const event = await createStudyEvent(
      payload.userId,
      title,
      description || "",
      start,
      end,
      taskId
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
