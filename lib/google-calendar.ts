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
  try {
    const calendar = await getCalendarClient(userId);

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    return response.data.items || [];
  } catch (error) {
    console.error("Error fetching calendar events:", error);
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
  try {
    const calendar = await getCalendarClient(userId);

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

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
    });

    return response.data;
  } catch (error) {
    console.error("Error creating calendar event:", error);
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
