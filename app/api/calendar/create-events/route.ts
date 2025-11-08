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
  console.log("\n" + "=".repeat(60));
  console.log("DEBUG: /api/calendar/create-events endpoint called");

  try {
    // Verify user is authenticated
    const authHeader = request.headers.get("authorization");
    const token = extractTokenFromHeader(authHeader);

    console.log("DEBUG: Auth header present:", !!authHeader);
    console.log("DEBUG: Token extracted:", !!token);

    if (!token) {
      console.log("ERROR: No token found in request");
      console.log("=".repeat(60) + "\n");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      console.log("ERROR: Token verification failed");
      console.log("=".repeat(60) + "\n");
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    console.log("DEBUG: User ID from token:", payload.userId);

    const body = await request.json();
    const { tasks } = body as { tasks: ScheduledTask[] };

    console.log("DEBUG: Received tasks:", tasks?.length || 0);

    if (!tasks || !Array.isArray(tasks)) {
      console.log("ERROR: Invalid tasks array");
      console.log("=".repeat(60) + "\n");
      return NextResponse.json(
        { error: "Invalid request: tasks array required" },
        { status: 400 }
      );
    }

    // Create calendar events for each task
    const createdEvents = [];
    const errors = [];

    console.log("DEBUG: Processing tasks...");

    for (const task of tasks) {
      try {
        console.log(`\nDEBUG: Processing task ${task.task_id}: ${task.title}`);
        console.log(`DEBUG: Start: ${task.scheduled_start}, End: ${task.scheduled_end}`);

        const startTime = new Date(task.scheduled_start);
        const endTime = new Date(task.scheduled_end);

        // Validate dates
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
          throw new Error(`Invalid date format: start=${task.scheduled_start}, end=${task.scheduled_end}`);
        }

        const event = await createStudyEvent(
          payload.userId,
          task.title,
          task.description || "",
          startTime,
          endTime,
          task.task_id
        );

        console.log(`DEBUG: Successfully created event for task ${task.task_id}`);
        console.log(`DEBUG: Event ID: ${event.id}, Link: ${event.htmlLink}`);

        createdEvents.push({
          task_id: task.task_id,
          event_id: event.id,
          event_link: event.htmlLink,
        });
      } catch (error: any) {
        console.error(`ERROR: Failed to create event for task ${task.task_id}:`, error.message);
        if (error.stack) {
          console.error("ERROR: Stack trace:", error.stack);
        }
        errors.push({
          task_id: task.task_id,
          error: error.message,
        });
      }
    }

    console.log(`\nDEBUG: Finished processing. Created: ${createdEvents.length}, Errors: ${errors.length}`);
    console.log("=".repeat(60) + "\n");

    return NextResponse.json({
      success: errors.length === 0,
      created_events: createdEvents,
      errors: errors.length > 0 ? errors : undefined,
      message: `Created ${createdEvents.length} of ${tasks.length} calendar events`,
    });
  } catch (error: any) {
    console.error("ERROR: Create calendar events error:", error.message);
    if (error.stack) {
      console.error("ERROR: Stack trace:", error.stack);
    }
    console.log("=".repeat(60) + "\n");
    return NextResponse.json(
      { error: "Failed to create calendar events" },
      { status: 500 }
    );
  }
}
