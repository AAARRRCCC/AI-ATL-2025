# Google Calendar Integration - Technical Documentation

## Overview

The Google Calendar integration enables Study Autopilot to:
- Read existing calendar events to find available time slots
- Create study session events directly in Google Calendar
- Update and reschedule events via drag-and-drop
- Automatically schedule assignments based on free time

## Architecture

### Frontend (Next.js)

```
app/
├── api/
│   ├── auth/[...nextauth]/route.ts  # NextAuth handler
│   └── calendar/
│       ├── events/route.ts          # Fetch calendar events
│       ├── free-blocks/route.ts     # Find available time
│       ├── create-event/route.ts    # Create new events
│       ├── update-event/route.ts    # Update events
│       └── delete-event/route.ts    # Delete events
├── auth/
│   └── signin/page.tsx              # Sign-in page
├── dashboard/page.tsx               # Main dashboard
└── providers.tsx                    # SessionProvider wrapper

components/
├── Calendar.tsx                     # Calendar with drag-and-drop
└── TaskCard.tsx                     # Task card component

lib/
├── auth.ts                          # NextAuth configuration
└── google-calendar.ts               # Google Calendar utilities
```

### Authentication Flow

1. User clicks "Sign in with Google"
2. NextAuth redirects to Google OAuth consent screen
3. User grants calendar permissions
4. Google redirects back with authorization code
5. NextAuth exchanges code for access/refresh tokens
6. Tokens stored in session (encrypted)
7. User redirected to dashboard

### Calendar Permissions

Required OAuth scopes:
- `https://www.googleapis.com/auth/calendar` - Full calendar access
- `https://www.googleapis.com/auth/calendar.events` - Event management

## Key Components

### 1. Google Calendar Service (`lib/google-calendar.ts`)

Utilities for interacting with Google Calendar API:

#### `getCalendarClient()`
- Creates authenticated Google Calendar client
- Uses access token from session
- Handles token refresh automatically

#### `getCalendarEvents(startDate, endDate)`
- Fetches events within date range
- Returns array of calendar events
- Used to display events and find conflicts

#### `findFreeTimeBlocks(startDate, endDate, minDuration)`
- Analyzes calendar to find available time slots
- Filters blocks by minimum duration (default: 45 min)
- Returns array of free time blocks

#### `createStudyEvent(title, description, startTime, endTime, taskId)`
- Creates new calendar event
- Tagged with `[Study Autopilot]` prefix
- Includes task ID in description
- Sets reminders and color coding

#### `updateCalendarEvent(eventId, startTime, endTime)`
- Updates event times (for drag-and-drop)
- Preserves other event properties

#### `deleteCalendarEvent(eventId)`
- Removes event from calendar
- Used when tasks are deleted

#### `isTimeSlotAvailable(startTime, endTime)`
- Checks for scheduling conflicts
- Returns boolean

### 2. Calendar Component (`components/Calendar.tsx`)

Interactive calendar with drag-and-drop:

**Features:**
- Week/Day/Month views
- Drag events to reschedule
- Resize events to adjust duration
- Click events for details
- Click empty slots to create tasks
- Color-coded by phase (Research, Drafting, Revision)
- Distinguishes Study Autopilot events from regular Google Calendar events

**Props:**
```typescript
interface CalendarProps {
  events?: CalendarEvent[];
  onEventMove?: (eventId: string, start: Date, end: Date) => void;
  onEventResize?: (eventId: string, start: Date, end: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onSelectSlot?: (start: Date, end: Date) => void;
}
```

**Event Color Coding:**
- Research phase: Blue (#3b82f6)
- Drafting phase: Purple (#8b5cf6)
- Revision phase: Green (#22c55e)
- Completed tasks: 60% opacity
- Non-Study Autopilot: Gray (#9ca3af)

### 3. Dashboard (`app/dashboard/page.tsx`)

Main application interface:

**Layout:**
- Header: App branding, user profile, settings, logout
- Left sidebar: Task list (scrollable)
- Right side: Calendar view (full height)

**Features:**
- Loads calendar events on mount
- Real-time event updates
- Drag-and-drop event rescheduling
- Event click handling
- Time slot selection for new tasks

## API Routes

### GET `/api/calendar/events`

Fetch calendar events for a date range.

**Query Parameters:**
- `startDate` (required): ISO date string
- `endDate` (required): ISO date string

**Response:**
```json
{
  "events": [
    {
      "id": "event-id",
      "summary": "Event title",
      "start": { "dateTime": "2024-01-01T10:00:00Z" },
      "end": { "dateTime": "2024-01-01T11:00:00Z" },
      "description": "Event description"
    }
  ]
}
```

### GET `/api/calendar/free-blocks`

Find available time slots.

**Query Parameters:**
- `startDate` (required): ISO date string
- `endDate` (required): ISO date string
- `minDuration` (optional): Minimum duration in minutes (default: 45)

**Response:**
```json
{
  "freeBlocks": [
    {
      "start": "2024-01-01T14:00:00Z",
      "end": "2024-01-01T16:00:00Z",
      "durationMinutes": 120
    }
  ]
}
```

### POST `/api/calendar/create-event`

Create a new study session event.

**Request Body:**
```json
{
  "title": "Research climate policy sources",
  "description": "Find and read 5 credible sources",
  "startTime": "2024-01-01T14:00:00Z",
  "endTime": "2024-01-01T16:00:00Z",
  "taskId": "task-id-123"
}
```

**Response:**
```json
{
  "event": {
    "id": "google-event-id",
    "summary": "[Study Autopilot] Research climate policy sources",
    ...
  }
}
```

### POST `/api/calendar/update-event`

Update event times (for drag-and-drop).

**Request Body:**
```json
{
  "eventId": "google-event-id",
  "startTime": "2024-01-01T15:00:00Z",
  "endTime": "2024-01-01T17:00:00Z"
}
```

### DELETE `/api/calendar/delete-event`

Delete a calendar event.

**Query Parameters:**
- `eventId` (required): Google Calendar event ID

## Usage Examples

### Example 1: Load User's Calendar Events

```typescript
const loadCalendarData = async () => {
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 14); // Next 2 weeks

  const response = await fetch(
    `/api/calendar/events?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
  );

  const data = await response.json();
  const events = data.events.map(event => ({
    id: event.id,
    title: event.summary,
    start: new Date(event.start.dateTime || event.start.date),
    end: new Date(event.end.dateTime || event.end.date),
  }));

  setEvents(events);
};
```

### Example 2: Find Free Time for Study Sessions

```typescript
const findAvailableTime = async () => {
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 7);

  const response = await fetch(
    `/api/calendar/free-blocks?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&minDuration=60`
  );

  const { freeBlocks } = await response.json();

  // freeBlocks contains all 60+ minute slots available
  console.log("Available time slots:", freeBlocks);
};
```

### Example 3: Create Study Session

```typescript
const createStudySession = async (task) => {
  const response = await fetch('/api/calendar/create-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: task.title,
      description: task.description,
      startTime: task.scheduledStart.toISOString(),
      endTime: task.scheduledEnd.toISOString(),
      taskId: task.id,
    }),
  });

  const { event } = await response.json();
  console.log('Created calendar event:', event.id);
};
```

### Example 4: Handle Drag-and-Drop Rescheduling

```typescript
const handleEventMove = async (eventId: string, start: Date, end: Date) => {
  const response = await fetch('/api/calendar/update-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventId,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    }),
  });

  if (response.ok) {
    // Update local state
    setEvents(prev =>
      prev.map(event =>
        event.id === eventId ? { ...event, start, end } : event
      )
    );
  }
};
```

## Integration with AI Scheduling

When AI creates a study plan:

1. **Analyze Assignment**: AI breaks down assignment into tasks with time estimates
2. **Find Free Time**: Call `/api/calendar/free-blocks` to get available slots
3. **Schedule Tasks**: For each task, find best-fit time slot
4. **Create Events**: Call `/api/calendar/create-event` for each scheduled task
5. **Update UI**: Display newly created events in calendar

Example AI scheduling flow:

```typescript
async function scheduleAssignment(assignment, tasks) {
  // 1. Get free time for next 2 weeks
  const freeBlocks = await findFreeTimeBlocks(
    new Date(),
    addDays(new Date(), 14)
  );

  // 2. Match tasks to time slots
  const schedule = [];
  for (const task of tasks) {
    const slot = findBestSlot(freeBlocks, task.estimatedDuration);
    if (slot) {
      schedule.push({
        task,
        start: slot.start,
        end: addMinutes(slot.start, task.estimatedDuration),
      });
      // Remove used time from available blocks
      freeBlocks = removeUsedTime(freeBlocks, slot);
    }
  }

  // 3. Create calendar events
  for (const item of schedule) {
    await createStudyEvent(
      item.task.title,
      item.task.description,
      item.start,
      item.end,
      item.task.id
    );
  }

  return schedule;
}
```

## Error Handling

Common errors and solutions:

### 401 Unauthorized
- Session expired or invalid
- Redirect user to sign-in page

### 403 Forbidden
- Insufficient calendar permissions
- Re-run OAuth flow to get permissions

### 409 Conflict
- Time slot already has an event
- Find alternative time or notify user

### 500 Internal Server Error
- Google Calendar API error
- Log error and show user-friendly message

## Token Refresh

Access tokens expire after 1 hour. The system automatically:
1. Checks token expiration before API calls
2. Uses refresh token to get new access token
3. Updates session with new token
4. Retries original request

Implemented in `lib/auth.ts` `refreshAccessToken()` function.

## Security Considerations

- **Tokens**: Stored in encrypted session cookies
- **Scopes**: Only request necessary calendar permissions
- **HTTPS**: Required in production for OAuth2
- **Validation**: All API routes check authentication
- **Rate Limiting**: Consider adding for production

## Future Enhancements

- [ ] Multiple calendar support (work, personal, etc.)
- [ ] Conflict detection before scheduling
- [ ] Batch event creation for better performance
- [ ] Calendar sync background job
- [ ] Event reminders and notifications
- [ ] Recurring study sessions
- [ ] Calendar export (iCal format)

## Testing

To test the integration:

1. **Manual Testing**:
   - Sign in with Google
   - View existing calendar events
   - Create a test event
   - Drag to reschedule
   - Delete event

2. **API Testing** (with Postman/curl):
   - Test each API endpoint individually
   - Verify authentication
   - Check error responses

3. **Integration Testing**:
   - Test full flow: sign in → load calendar → create event
   - Test edge cases (no events, conflicting times, etc.)

## Debugging

Enable debug logging:

```typescript
// In lib/google-calendar.ts
console.log("Calendar events:", events);
console.log("Free blocks:", freeBlocks);
```

Check browser DevTools:
- Network tab: View API requests/responses
- Console: Check for JavaScript errors
- Application tab: Inspect session storage

## Performance Optimization

- Cache calendar events (TTL: 5 minutes)
- Debounce drag-and-drop updates
- Lazy load calendar events (only visible range)
- Pagination for large task lists

---

For setup instructions, see [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md)
