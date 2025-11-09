import { NextRequest, NextResponse } from "next/server";
import { extractTokenFromHeader, verifyToken } from "@/lib/auth";
import { deleteCalendarEvent, getCalendarClient } from "@/lib/google-calendar";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

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

    // First, get the event details to extract task ID if it's a SteadyStudy event
    let taskId: string | null = null;
    let assignmentId: string | null = null;

    try {
      const calendar = await getCalendarClient(payload.userId);
      const eventDetails = await calendar.events.get({
        calendarId: "primary",
        eventId: eventId,
      });

      // Check if this is a SteadyStudy event
      const summary = eventDetails.data.summary || "";
      if (summary.includes("[SteadyStudy]")) {
        // Extract task ID from description
        const description = eventDetails.data.description || "";
        const taskIdMatch = description.match(/Task ID: ([a-f0-9]{24})/i);
        if (taskIdMatch) {
          taskId = taskIdMatch[1];
          console.log(`📝 Found task ID in event: ${taskId}`);
        }
      }
    } catch (error) {
      console.error("Error fetching event details:", error);
      // Continue with deletion even if we can't get details
    }

    // Delete from Google Calendar
    await deleteCalendarEvent(payload.userId, eventId);
    console.log(`🗑️ Deleted event ${eventId} from Google Calendar`);

    // If we found a task ID, delete from database
    if (taskId) {
      const db = await getDatabase();
      const tasksCollection = db.collection("subtasks");
      const assignmentsCollection = db.collection("assignments");

      // Get task details before deleting
      const task = await tasksCollection.findOne({ _id: new ObjectId(taskId) });

      if (task) {
        assignmentId = task.assignment_id?.toString() || null;

        // Delete the task from database
        await tasksCollection.deleteOne({ _id: new ObjectId(taskId) });
        console.log(`🗑️ Deleted task ${taskId} from database`);

        // Check if assignment has any remaining tasks
        if (assignmentId) {
          const remainingTasks = await tasksCollection.countDocuments({
            assignment_id: new ObjectId(assignmentId),
          });

          // If no tasks left, delete the assignment
          if (remainingTasks === 0) {
            await assignmentsCollection.deleteOne({ _id: new ObjectId(assignmentId) });
            console.log(`🗑️ Deleted assignment ${assignmentId} (no tasks remaining)`);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      deletedTask: !!taskId,
      deletedAssignment: assignmentId && taskId ? true : false
    });
  } catch (error) {
    console.error("Delete event error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to delete calendar event";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
