import { NextRequest, NextResponse } from "next/server";
import { extractTokenFromHeader, verifyToken } from "@/lib/auth";
import { getCalendarEvents } from "@/lib/google-calendar";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

/**
 * POST /api/assignments/sync-with-calendar
 *
 * Syncs assignments with Google Calendar - deletes assignments/tasks
 * that no longer have corresponding calendar events.
 * Google Calendar is the source of truth.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const db = await getDatabase();
    const assignmentsCollection = db.collection("assignments");
    const tasksCollection = db.collection("tasks");

    // Get date range for calendar events
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3); // 3 months ago
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 6); // 6 months ahead

    // Fetch all SteadyStudy events from Google Calendar
    console.log("Fetching calendar events for sync...");
    const calendarEvents = await getCalendarEvents(payload.userId, startDate, endDate);
    const steadyStudyEvents = calendarEvents.filter(event =>
      event.summary?.includes("[SteadyStudy]")
    );

    console.log(`Found ${steadyStudyEvents.length} SteadyStudy events in calendar`);

    // Extract task titles from calendar events
    // Calendar events are formatted like: "[SteadyStudy] Task Title - Phase"
    const calendarTaskTitles = new Set(
      steadyStudyEvents.map(event => {
        if (!event.summary) return null;
        // Remove [SteadyStudy] prefix and extract task title
        const withoutPrefix = event.summary.replace("[SteadyStudy]", "").trim();
        // Some events may have " - Phase" suffix, remove it
        const title = withoutPrefix.split(" - ")[0].trim();
        return title;
      }).filter(Boolean)
    );

    console.log(`Unique task titles in calendar: ${calendarTaskTitles.size}`);

    // Fetch all user assignments
    const assignments = await assignmentsCollection
      .find({ userId: new ObjectId(payload.userId) })
      .toArray();

    console.log(`Found ${assignments.length} assignments in database`);

    let deletedAssignments = 0;
    let deletedTasks = 0;

    // Process each assignment
    for (const assignment of assignments) {
      // Get all tasks for this assignment
      const tasks = await tasksCollection
        .find({ assignmentId: new ObjectId(assignment._id) })
        .toArray();

      console.log(`Assignment "${assignment.title}" has ${tasks.length} tasks`);

      // Check which tasks still exist in calendar
      const tasksToDelete = [];
      const tasksToKeep = [];

      for (const task of tasks) {
        const taskTitle = task.title;
        if (calendarTaskTitles.has(taskTitle)) {
          tasksToKeep.push(task);
        } else {
          tasksToDelete.push(task);
        }
      }

      console.log(`  - Tasks to keep: ${tasksToKeep.length}`);
      console.log(`  - Tasks to delete: ${tasksToDelete.length}`);

      // Delete tasks that are not in calendar
      if (tasksToDelete.length > 0) {
        const taskIds = tasksToDelete.map(t => t._id);
        const result = await tasksCollection.deleteMany({
          _id: { $in: taskIds }
        });
        deletedTasks += result.deletedCount;
        console.log(`  - Deleted ${result.deletedCount} tasks`);
      }

      // If no tasks remain, delete the assignment
      if (tasksToKeep.length === 0) {
        await assignmentsCollection.deleteOne({ _id: assignment._id });
        deletedAssignments++;
        console.log(`  - Deleted assignment "${assignment.title}" (no tasks remaining)`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sync completed: deleted ${deletedAssignments} assignments and ${deletedTasks} orphaned tasks`,
      deleted_assignments: deletedAssignments,
      deleted_tasks: deletedTasks,
      calendar_events: steadyStudyEvents.length
    });

  } catch (error: any) {
    console.error("Assignment sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync assignments with calendar" },
      { status: 500 }
    );
  }
}
