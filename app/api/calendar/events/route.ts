import { NextRequest, NextResponse } from "next/server";
import { extractTokenFromHeader, verifyToken } from "@/lib/auth";
import { getCalendarEvents } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  console.log("\n" + "=".repeat(60));
  console.log("DEBUG: GET /api/calendar/events called");

  try {
    // Authenticate with JWT
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
    console.log("DEBUG: User ID:", payload?.userId);

    if (!payload) {
      console.log("ERROR: Invalid token");
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    console.log("DEBUG: Start date:", startDate);
    console.log("DEBUG: End date:", endDate);

    if (!startDate || !endDate) {
      console.log("ERROR: Missing date parameters");
      return NextResponse.json(
        { error: "start_date and end_date are required" },
        { status: 400 }
      );
    }

    console.log("DEBUG: Calling getCalendarEvents for user:", payload.userId);
    console.log("DEBUG: Date range:", new Date(startDate), "to", new Date(endDate));

    const events = await getCalendarEvents(
      payload.userId,
      new Date(startDate),
      new Date(endDate)
    );

    console.log("DEBUG: Received", events.length, "events from Google Calendar");

    const formattedEvents = events.map((event) => ({
      id: event.id,
      title: event.summary || "Untitled",
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      description: event.description || "",
      location: event.location || "",
    }));

    console.log("DEBUG: Formatted events:", JSON.stringify(formattedEvents, null, 2));
    console.log("=".repeat(60) + "\n");

    return NextResponse.json({
      success: true,
      events: formattedEvents,
    });
  } catch (error: any) {
    console.error("ERROR: Calendar events fatal error");
    console.error("ERROR: Type:", error.constructor?.name);
    console.error("ERROR: Message:", error.message);
    console.error("ERROR: Stack:", error.stack);
    console.log("=".repeat(60) + "\n");

    // Check if it's a "not connected" error
    if (error.message?.includes("not connected")) {
      return NextResponse.json({
        success: false,
        events: [],
        error: "Google Calendar not connected",
      });
    }

    return NextResponse.json(
      { error: "Failed to fetch calendar events" },
      { status: 500 }
    );
  }
}
