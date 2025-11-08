import { NextRequest, NextResponse } from "next/server";
import { extractTokenFromHeader, verifyToken } from "@/lib/auth";
import { createStudyEvent } from "@/lib/google-calendar";

interface ScheduledTask {
  task_id: string;
  title: string;
  scheduled_start: string;
  scheduled_end: string;
  duration_minutes: number;
  description?: string;
}

/**
 * POST: Create Google Calendar events for scheduled tasks
 * Called by the Python backend after scheduling tasks
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
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
    const { tasks } = body as { tasks: ScheduledTask[] };

    if (!tasks || !Array.isArray(tasks)) {
      return NextResponse.json(
        { error: "Invalid request: tasks array required" },
        { status: 400 }
      );
    }

    // Create calendar events for each task
    const createdEvents = [];
    const errors = [];

    for (const task of tasks) {
      try {
        const eventData = {
          title: task.title,
          description: task.description || "",
          startTime: new Date(task.scheduled_start),
          endTime: new Date(task.scheduled_end),
          taskId: task.task_id,
        };

        const event = await createStudyEvent(payload.userId, eventData);

        createdEvents.push({
          task_id: task.task_id,
          event_id: event.id,
          event_link: event.htmlLink,
        });
      } catch (error: any) {
        console.error(`Failed to create event for task ${task.task_id}:`, error);
        errors.push({
          task_id: task.task_id,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      created_events: createdEvents,
      errors: errors.length > 0 ? errors : undefined,
      message: `Created ${createdEvents.length} of ${tasks.length} calendar events`,
    });
  } catch (error) {
    console.error("Create calendar events error:", error);
    return NextResponse.json(
      { error: "Failed to create calendar events" },
      { status: 500 }
    );
  }
}
