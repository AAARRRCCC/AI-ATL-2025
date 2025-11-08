import { google } from "googleapis";
import { getDatabase } from "./mongodb";
import { USERS_COLLECTION, User } from "@/models/User";
import { ObjectId } from "mongodb";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback"
);

/**
 * Get authenticated Google Calendar client for a specific user
 */
export async function getCalendarClient(userId: string) {
  const db = await getDatabase();
  const usersCollection = db.collection<User>(USERS_COLLECTION);

  const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

  if (!user) {
    throw new Error("User not found");
  }

  if (!user.googleAccessToken) {
    throw new Error("Google Calendar not connected. Please connect your Google account first.");
  }

  // Check if token is expired and refresh if needed
  const now = new Date();
  if (user.googleTokenExpiry && user.googleTokenExpiry < now && user.googleRefreshToken) {
    // Token expired, refresh it
    oauth2Client.setCredentials({
      refresh_token: user.googleRefreshToken,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      throw new Error("Failed to refresh access token");
    }

    // Update user with new tokens
    await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          googleAccessToken: credentials.access_token,
          googleTokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : new Date(Date.now() + 3600 * 1000),
          updatedAt: new Date(),
        },
      }
    );

    oauth2Client.setCredentials({
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token,
    });
  } else {
    // Token still valid, use it
    oauth2Client.setCredentials({
      access_token: user.googleAccessToken,
      refresh_token: user.googleRefreshToken,
    });
  }

  return google.calendar({ version: "v3", auth: oauth2Client });
}

/**
 * Get calendar events within a date range
 */
export async function getCalendarEvents(userId: string, startDate: Date, endDate: Date) {
  console.log("\n" + "-".repeat(60));
  console.log("DEBUG: getCalendarEvents called");
  console.log("DEBUG: User ID:", userId);
  console.log("DEBUG: Start date:", startDate.toISOString());
  console.log("DEBUG: End date:", endDate.toISOString());

  try {
    console.log("DEBUG: Getting calendar client...");
    const calendar = await getCalendarClient(userId);
    console.log("DEBUG: Calendar client obtained");

    console.log("DEBUG: Calling Google Calendar API events.list...");
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = response.data.items || [];
    console.log("DEBUG: Google Calendar returned", events.length, "events");

    events.forEach((event, i) => {
      console.log(`DEBUG: Event ${i+1}:`, event.summary, "-", event.start?.dateTime || event.start?.date);
    });

    console.log("-".repeat(60) + "\n");

    return events;
  } catch (error: any) {
    console.error("ERROR: Failed to fetch calendar events");
    console.error("ERROR: Type:", error.constructor?.name);
    console.error("ERROR: Message:", error.message);
    if (error.response) {
      console.error("ERROR: Google API response:", error.response.data);
    }
    console.log("-".repeat(60) + "\n");
    throw error;
  }
}

/**
 * Find free time blocks in the calendar
 */
export async function findFreeTimeBlocks(
  userId: string,
  startDate: Date,
  endDate: Date,
  minDurationMinutes: number = 45
) {
  const events = await getCalendarEvents(userId, startDate, endDate);
  const freeBlocks: Array<{ start: Date; end: Date; durationMinutes: number }> = [];

  let currentTime = new Date(startDate);

  // Sort events by start time
  const sortedEvents = events.sort((a, b) => {
    const aStart = new Date(a.start?.dateTime || a.start?.date || 0);
    const bStart = new Date(b.start?.dateTime || b.start?.date || 0);
    return aStart.getTime() - bStart.getTime();
  });

  for (const event of sortedEvents) {
    const eventStart = new Date(event.start?.dateTime || event.start?.date || 0);
    const eventEnd = new Date(event.end?.dateTime || event.end?.date || 0);

    // Calculate gap before this event
    const gapMinutes = (eventStart.getTime() - currentTime.getTime()) / (1000 * 60);

    if (gapMinutes >= minDurationMinutes) {
      freeBlocks.push({
        start: new Date(currentTime),
        end: new Date(eventStart),
        durationMinutes: gapMinutes,
      });
    }

    // Move current time to after this event
    currentTime = new Date(Math.max(currentTime.getTime(), eventEnd.getTime()));
  }

  // Check for free time after the last event
  const remainingMinutes = (endDate.getTime() - currentTime.getTime()) / (1000 * 60);
  if (remainingMinutes >= minDurationMinutes) {
    freeBlocks.push({
      start: new Date(currentTime),
      end: new Date(endDate),
      durationMinutes: remainingMinutes,
    });
  }

  return freeBlocks;
}

/**
 * Create a study session event in Google Calendar
 */
export async function createStudyEvent(
  userId: string,
  title: string,
  description: string,
  startTime: Date,
  endTime: Date,
  taskId?: string
) {
  console.log("\n" + "=".repeat(60));
  console.log("DEBUG: createStudyEvent called");
  console.log("DEBUG: User ID:", userId);
  console.log("DEBUG: Title:", title);
  console.log("DEBUG: Start time:", startTime.toISOString());
  console.log("DEBUG: End time:", endTime.toISOString());
  console.log("DEBUG: Task ID:", taskId || "none");

  try {
    console.log("DEBUG: Getting calendar client...");
    const calendar = await getCalendarClient(userId);
    console.log("DEBUG: Calendar client obtained successfully");

    const event = {
      summary: `[Study Autopilot] ${title}`,
      description: `${description}\n\n${taskId ? `Task ID: ${taskId}` : ""}`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      reminders: {
        useDefault: false,
        overrides: [{ method: "popup", minutes: 10 }],
      },
      colorId: "9", // Blue color for study sessions
    };

    console.log("DEBUG: Event object created:", JSON.stringify(event, null, 2));
    console.log("DEBUG: Calling Google Calendar API events.insert...");

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
    });

    console.log("DEBUG: Google Calendar API response status:", response.status);
    console.log("DEBUG: Created event ID:", response.data.id);
    console.log("DEBUG: Created event link:", response.data.htmlLink);
    console.log("=".repeat(60) + "\n");

    return response.data;
  } catch (error: any) {
    console.error("ERROR: Failed to create calendar event");
    console.error("ERROR: Type:", error.constructor?.name);
    console.error("ERROR: Message:", error.message);
    if (error.response) {
      console.error("ERROR: Google API response status:", error.response.status);
      console.error("ERROR: Google API response data:", JSON.stringify(error.response.data, null, 2));
    }
    if (error.stack) {
      console.error("ERROR: Stack trace:", error.stack);
    }
    console.log("=".repeat(60) + "\n");
    throw error;
  }
}

/**
 * Update an existing calendar event
 */
export async function updateCalendarEvent(
  userId: string,
  eventId: string,
  startTime: Date,
  endTime: Date
) {
  try {
    const calendar = await getCalendarClient(userId);

    // First, get the existing event
    const existingEvent = await calendar.events.get({
      calendarId: "primary",
      eventId: eventId,
    });

    // Update the times
    const updatedEvent = {
      ...existingEvent.data,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };

    const response = await calendar.events.update({
      calendarId: "primary",
      eventId: eventId,
      requestBody: updatedEvent,
    });

    return response.data;
  } catch (error) {
    console.error("Error updating calendar event:", error);
    throw error;
  }
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(userId: string, eventId: string) {
  try {
    const calendar = await getCalendarClient(userId);

    await calendar.events.delete({
      calendarId: "primary",
      eventId: eventId,
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting calendar event:", error);
    throw error;
  }
}

/**
 * Check if a time slot is available (no conflicts)
 */
export async function isTimeSlotAvailable(
  userId: string,
  startTime: Date,
  endTime: Date
): Promise<boolean> {
  const events = await getCalendarEvents(userId, startTime, endTime);

  // Check if any events overlap with the proposed time slot
  for (const event of events) {
    const eventStart = new Date(event.start?.dateTime || event.start?.date || 0);
    const eventEnd = new Date(event.end?.dateTime || event.end?.date || 0);

    // Check for overlap
    if (startTime < eventEnd && endTime > eventStart) {
      return false; // Conflict found
    }
  }

  return true; // No conflicts
}
