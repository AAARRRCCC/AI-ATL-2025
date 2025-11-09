import { NextRequest, NextResponse } from "next/server";
import { extractTokenFromHeader, verifyToken } from "@/lib/auth";
import { getCalendarEvents, deleteCalendarEvent } from "@/lib/google-calendar";

/**
 * DELETE /api/calendar/clear-study-events
 *
 * Deletes all SteadyStudy events from Google Calendar
 */
export async function DELETE(request: NextRequest) {
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

    // Get events from a wide date range to catch all study sessions
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3); // 3 months ago

    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 6); // 6 months ahead

    console.log("Fetching calendar events to find SteadyStudy events...");
    const events = await getCalendarEvents(payload.userId, startDate, endDate);

    // Filter for SteadyStudy events
    const studyEvents = events.filter(event =>
      event.summary?.includes("[SteadyStudy]")
    );

    console.log(`Found ${studyEvents.length} SteadyStudy events to delete`);

    // Delete each study event
    const deletedIds = [];
    const errors = [];

    for (const event of studyEvents) {
      try {
        if (event.id) {
          await deleteCalendarEvent(payload.userId, event.id);
          deletedIds.push(event.id);
          console.log(`Deleted event: ${event.summary}`);
        }
      } catch (error: any) {
        console.error(`Failed to delete event ${event.id}:`, error.message);
        errors.push({
          event_id: event.id,
          title: event.summary,
          error: error.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      deleted_count: deletedIds.length,
      total_found: studyEvents.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Deleted ${deletedIds.length} of ${studyEvents.length} SteadyStudy events`
    });

  } catch (error: any) {
    console.error("Clear study events error:", error.message);
    return NextResponse.json(
      { error: "Failed to clear study events" },
      { status: 500 }
    );
  }
}
