import { NextRequest, NextResponse } from "next/server";
import { extractTokenFromHeader, verifyToken } from "@/lib/auth";
import { getCalendarEvents } from "@/lib/google-calendar";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

/**
 * POST /api/assignments/sync-with-calendar
 *
 * Syncs assignments with Google Calendar by cross-checking subtasks.
 * - Deletes subtasks that no longer have corresponding calendar events
 * - Updates assignment metadata (total hours, task count)
 * - Deletes assignments if all subtasks are removed
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
    const subtasksCollection = db.collection("tasks"); // Subtasks table

    // Get date range for calendar events
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3); // 3 months ago
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 6); // 6 months ahead

    // Fetch all SteadyStudy events from Google Calendar
    console.log("Fetching calendar events for sync...");
    console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    const calendarEvents = await getCalendarEvents(payload.userId, startDate, endDate);
    console.log(`Total calendar events found: ${calendarEvents.length}`);
    const steadyStudyEvents = calendarEvents.filter(event =>
      event.summary?.includes("[SteadyStudy]")
    );

    console.log(`Found ${steadyStudyEvents.length} SteadyStudy events in calendar`);
    console.log("SteadyStudy event titles:", steadyStudyEvents.map(e => e.summary));

    // Extract subtask titles from calendar events
    // Calendar events are formatted like: "[SteadyStudy] Task Title - Phase"
    const calendarSubtaskTitles = new Set(
      steadyStudyEvents.map(event => {
        if (!event.summary) return null;
        // Remove [SteadyStudy] prefix and extract task title
        const withoutPrefix = event.summary.replace("[SteadyStudy]", "").trim();
        // Some events may have " - Phase" suffix, remove it
        const title = withoutPrefix.split(" - ")[0].trim();
        return title;
      }).filter(Boolean)
    );

    console.log(`Unique subtask titles in calendar: ${calendarSubtaskTitles.size}`);
    console.log("Calendar subtask titles:", Array.from(calendarSubtaskTitles));

    // Fetch all user assignments
    // NOTE: Python backend stores user_id as string, not ObjectId
    const assignments = await assignmentsCollection
      .find({ user_id: payload.userId })
      .toArray();

    console.log(`Found ${assignments.length} assignments in database for user ${payload.userId}`);

    let deletedAssignments = 0;
    let deletedSubtasks = 0;
    let updatedAssignments = 0;

    // Process each assignment
    for (const assignment of assignments) {
      // Get all subtasks for this assignment
      // NOTE: Python backend stores assignment_id as string, not ObjectId
      const subtasks = await subtasksCollection
        .find({ assignment_id: assignment._id.toString() })
        .toArray();

      console.log(`Assignment "${assignment.title}" (ID: ${assignment._id}) has ${subtasks.length} subtasks`);

      // Check which subtasks still exist in calendar
      const subtasksToDelete = [];
      const subtasksToKeep = [];

      for (const subtask of subtasks) {
        const subtaskTitle = subtask.title;
        if (calendarSubtaskTitles.has(subtaskTitle)) {
          subtasksToKeep.push(subtask);
          console.log(`    ✓ KEEP: "${subtaskTitle}" (found in calendar)`);
        } else {
          subtasksToDelete.push(subtask);
          console.log(`    ✗ DELETE: "${subtaskTitle}" (NOT found in calendar)`);
        }
      }

      console.log(`  - Subtasks to keep: ${subtasksToKeep.length}`);
      console.log(`  - Subtasks to delete: ${subtasksToDelete.length}`);

      // Delete subtasks that are not in calendar
      if (subtasksToDelete.length > 0) {
        const subtaskIds = subtasksToDelete.map(t => t._id);
        const result = await subtasksCollection.deleteMany({
          _id: { $in: subtaskIds }
        });
        deletedSubtasks += result.deletedCount;
        console.log(`  - Deleted ${result.deletedCount} orphaned subtasks`);
      }

      // If no subtasks remain, delete the assignment
      if (subtasksToKeep.length === 0) {
        await assignmentsCollection.deleteOne({ _id: assignment._id });
        deletedAssignments++;
        console.log(`  - Deleted assignment "${assignment.title}" (no subtasks remaining)`);
      }
      // If some subtasks were deleted but some remain, update assignment metadata
      else if (subtasksToDelete.length > 0) {
        // Recalculate total estimated hours from remaining subtasks
        const totalEstimatedMinutes = subtasksToKeep.reduce(
          (sum, subtask) => sum + (subtask.estimated_duration || 0),
          0
        );
        const totalEstimatedHours = totalEstimatedMinutes / 60;

        // Update assignment with new totals
        await assignmentsCollection.updateOne(
          { _id: assignment._id },
          {
            $set: {
              total_estimated_hours: totalEstimatedHours,
              updatedAt: new Date()
            }
          }
        );
        updatedAssignments++;
        console.log(`  - Updated assignment "${assignment.title}": ${totalEstimatedHours.toFixed(1)} hours (${subtasksToKeep.length} subtasks remaining)`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sync completed: deleted ${deletedAssignments} assignments, ${deletedSubtasks} orphaned subtasks, updated ${updatedAssignments} assignments`,
      deleted_assignments: deletedAssignments,
      deleted_subtasks: deletedSubtasks,
      updated_assignments: updatedAssignments,
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
