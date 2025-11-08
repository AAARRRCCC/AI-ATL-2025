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
  console.log("DEBUG: Calendar API /api/calendar/create-events called");

  try {
    // Verify user is authenticated
    const authHeader = request.headers.get("authorization");
    const token = extractTokenFromHeader(authHeader);

    console.log("DEBUG: Auth header present:", !!authHeader);
    console.log("DEBUG: Token extracted:", !!token);

    if (!token) {
      console.log("ERROR: No token provided");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    console.log("DEBUG: Token verified:", !!payload);
    console.log("DEBUG: User ID from token:", payload?.userId);

    if (!payload) {
      console.log("ERROR: Invalid token");
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await request.json();
    const { tasks } = body as { tasks: ScheduledTask[] };

    console.log("DEBUG: Request body received");
    console.log("DEBUG: Number of tasks:", tasks?.length);
    console.log("DEBUG: Tasks data:", JSON.stringify(tasks, null, 2));

    if (!tasks || !Array.isArray(tasks)) {
      console.log("ERROR: Invalid tasks array");
      return NextResponse.json(
        { error: "Invalid request: tasks array required" },
        { status: 400 }
      );
    }

    // Create calendar events for each task
    const createdEvents = [];
    const errors = [];

    console.log(`DEBUG: Starting to create ${tasks.length} calendar events`);

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      console.log(`\nDEBUG: Processing task ${i + 1}/${tasks.length}`);
      console.log(`DEBUG: Task ID: ${task.task_id}`);
      console.log(`DEBUG: Task title: ${task.title}`);
      console.log(`DEBUG: Scheduled start: ${task.scheduled_start}`);
      console.log(`DEBUG: Scheduled end: ${task.scheduled_end}`);

      try {
        const startTime = new Date(task.scheduled_start);
        const endTime = new Date(task.scheduled_end);

        console.log(`DEBUG: Parsed start time: ${startTime}`);
        console.log(`DEBUG: Parsed end time: ${endTime}`);

        // Validate dates
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
          throw new Error(`Invalid date format: start=${task.scheduled_start}, end=${task.scheduled_end}`);
        }

        console.log(`DEBUG: Calling createStudyEvent for user ${payload.userId}`);

        const event = await createStudyEvent(
          payload.userId,
          task.title,
          task.description || "",
          startTime,
          endTime,
          task.task_id
        );

        console.log(`DEBUG: Successfully created event ${event.id}`);
        console.log(`DEBUG: Event link: ${event.htmlLink}`);

        createdEvents.push({
          task_id: task.task_id,
          event_id: event.id,
          event_link: event.htmlLink,
        });
      } catch (error: any) {
        console.error(`ERROR: Failed to create event for task ${task.task_id}:`, error);
        console.error(`ERROR: Error type: ${error.constructor.name}`);
        console.error(`ERROR: Error message: ${error.message}`);
        console.error(`ERROR: Stack trace:`, error.stack);
        errors.push({
          task_id: task.task_id,
          error: error.message,
        });
      }
    }

    console.log(`\nDEBUG: Summary - Created ${createdEvents.length} events, ${errors.length} errors`);
    console.log("=".repeat(60) + "\n");

    return NextResponse.json({
      success: errors.length === 0,
      created_events: createdEvents,
      errors: errors.length > 0 ? errors : undefined,
      message: `Created ${createdEvents.length} of ${tasks.length} calendar events`,
    });
  } catch (error: any) {
    console.error("ERROR: Create calendar events fatal error:", error);
    console.error("ERROR: Error type:", error.constructor.name);
    console.error("ERROR: Error message:", error.message);
    console.error("ERROR: Stack trace:", error.stack);
    console.log("=".repeat(60) + "\n");
    return NextResponse.json(
      { error: "Failed to create calendar events" },
      { status: 500 }
    );
  }
}
