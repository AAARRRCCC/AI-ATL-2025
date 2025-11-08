# API Reference - Study Autopilot

> Complete API documentation for all endpoints

**Base URL (Frontend)**: `http://localhost:3000/api`
**Base URL (Backend)**: `http://localhost:8000`

**Last Updated**: 2025-01-08

---

## Table of Contents

1. [Authentication](#authentication)
2. [Calendar Operations](#calendar-operations)
3. [Assignment Management](#assignment-management)
4. [Task Operations](#task-operations)
5. [User Preferences](#user-preferences)
6. [Chat Operations](#chat-operations)
7. [Debug Endpoints](#debug-endpoints)
8. [WebSocket API](#websocket-api)
9. [Error Handling](#error-handling)

---

## Authentication

All endpoints except `/auth/signup`, `/auth/login`, and `/auth/google/callback` require authentication.

**Authentication Header**:
```
Authorization: Bearer <jwt_token>
```

**Token Source**: Stored in `localStorage` under key `token`

---

### POST /api/auth/signup

Create a new user account.

**Location**: `app/api/auth/signup/route.ts`

**Request**:
```json
{
  "email": "student@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

**Validation**:
- `email`: Required, must be valid email format
- `password`: Required, minimum 6 characters
- `name`: Required, non-empty string

**Response** (201 Created):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "student@example.com",
    "name": "John Doe",
    "createdAt": "2025-01-08T10:30:00.000Z"
  }
}
```

**Errors**:
```json
// 400 Bad Request - Validation error
{
  "error": "Email, password, and name are required"
}

// 400 Bad Request - User exists
{
  "error": "User already exists"
}

// 500 Internal Server Error
{
  "error": "Failed to create user"
}
```

**Example**:
```typescript
const response = await fetch('/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'student@example.com',
    password: 'securepass',
    name: 'John Doe'
  })
});

const data = await response.json();
localStorage.setItem('token', data.token);
```

---

### POST /api/auth/login

Authenticate an existing user.

**Location**: `app/api/auth/login/route.ts`

**Request**:
```json
{
  "email": "student@example.com",
  "password": "securepassword"
}
```

**Response** (200 OK):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "student@example.com",
    "name": "John Doe",
    "hasGoogleCalendar": true
  }
}
```

**Errors**:
```json
// 400 Bad Request
{
  "error": "Email and password are required"
}

// 401 Unauthorized - User not found
{
  "error": "User not found"
}

// 401 Unauthorized - Wrong password
{
  "error": "Invalid password"
}
```

**Example**:
```typescript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'student@example.com',
    password: 'securepass'
  })
});

const { token, user } = await response.json();
localStorage.setItem('token', token);
```

---

### GET /api/auth/me

Get current authenticated user information.

**Location**: `app/api/auth/me/route.ts`

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "student@example.com",
  "name": "John Doe",
  "createdAt": "2025-01-08T10:30:00.000Z",
  "hasGoogleCalendar": true
}
```

**Errors**:
```json
// 401 Unauthorized
{
  "error": "No token provided"
}

// 401 Unauthorized
{
  "error": "Invalid token"
}

// 404 Not Found
{
  "error": "User not found"
}
```

---

### GET /api/auth/google

Initiate Google OAuth flow for calendar access.

**Location**: `app/api/auth/google/route.ts`

**Headers**:
```
Authorization: Bearer <token>
```

**Query Parameters**: None

**Response** (302 Redirect):
Redirects to Google OAuth consent screen with scopes:
- `https://www.googleapis.com/auth/calendar`
- `https://www.googleapis.com/auth/calendar.events`

**Example**:
```typescript
// In component
const connectGoogle = () => {
  const token = localStorage.getItem('token');
  window.location.href = `/api/auth/google?token=${token}`;
};
```

---

### GET /api/auth/google/callback

Handle Google OAuth callback (redirect target).

**Location**: `app/api/auth/google/callback/route.ts`

**Query Parameters**:
- `code`: Authorization code from Google
- `state`: User ID (for identification)

**Response** (302 Redirect):
Redirects to `/dashboard` after storing tokens.

**Errors**:
Redirects to `/dashboard?error=oauth_failed` on failure.

**Note**: This endpoint is called automatically by Google OAuth. Users should not call it directly.

---

## Calendar Operations

### GET /api/calendar/events

Fetch calendar events for a date range.

**Location**: `app/api/calendar/events/route.ts`

**Headers**:
```
Authorization: Bearer <token>
```

**Query Parameters**:
- `start`: ISO 8601 datetime (e.g., `2025-01-01T00:00:00Z`)
- `end`: ISO 8601 datetime (e.g., `2025-01-31T23:59:59Z`)

**Response** (200 OK):
```json
{
  "events": [
    {
      "id": "google_event_id_123",
      "summary": "CS Project - Research Phase",
      "description": "Research machine learning algorithms",
      "start": {
        "dateTime": "2025-01-10T14:00:00Z"
      },
      "end": {
        "dateTime": "2025-01-10T17:00:00Z"
      },
      "colorId": "1",
      "extendedProperties": {
        "private": {
          "studyAutopilot": "true",
          "assignmentId": "507f1f77bcf86cd799439011",
          "taskId": "507f191e810c19729de860ea",
          "phase": "research"
        }
      }
    },
    {
      "id": "regular_google_event",
      "summary": "Dentist Appointment",
      "start": {
        "dateTime": "2025-01-11T10:00:00Z"
      },
      "end": {
        "dateTime": "2025-01-11T11:00:00Z"
      }
    }
  ]
}
```

**Color IDs**:
- `1`: Blue (Research phase)
- `10`: Purple (Drafting phase)
- `11`: Green (Revision phase)

**Errors**:
```json
// 401 Unauthorized
{
  "error": "Google Calendar not connected"
}

// 400 Bad Request
{
  "error": "Start and end dates are required"
}
```

**Example**:
```typescript
const fetchEvents = async () => {
  const token = localStorage.getItem('token');
  const start = new Date('2025-01-01').toISOString();
  const end = new Date('2025-01-31').toISOString();

  const response = await fetch(
    `/api/calendar/events?start=${start}&end=${end}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );

  const { events } = await response.json();
  return events;
};
```

---

### POST /api/calendar/create

Create a new calendar event.

**Location**: `app/api/calendar/create/route.ts`

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request**:
```json
{
  "summary": "History Essay - Research",
  "description": "Research Renaissance art movements",
  "start": "2025-01-10T14:00:00Z",
  "end": "2025-01-10T17:00:00Z",
  "assignmentId": "507f1f77bcf86cd799439011",
  "taskId": "507f191e810c19729de860ea",
  "phase": "research"
}
```

**Fields**:
- `summary`: Required, event title
- `description`: Optional, event description
- `start`: Required, ISO 8601 datetime
- `end`: Required, ISO 8601 datetime
- `assignmentId`: Optional, links to assignment
- `taskId`: Optional, links to task
- `phase`: Optional, one of: `research`, `drafting`, `revision`

**Response** (201 Created):
```json
{
  "eventId": "google_event_id_456",
  "htmlLink": "https://calendar.google.com/calendar/event?eid=..."
}
```

**Errors**:
```json
// 401 Unauthorized
{
  "error": "Google Calendar not connected"
}

// 400 Bad Request
{
  "error": "Summary, start, and end are required"
}
```

**Example**:
```typescript
const createEvent = async (eventData) => {
  const token = localStorage.getItem('token');

  const response = await fetch('/api/calendar/create', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(eventData)
  });

  return await response.json();
};
```

---

### PUT /api/calendar/update

Update an existing calendar event.

**Location**: `app/api/calendar/update/route.ts`

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request**:
```json
{
  "eventId": "google_event_id_123",
  "start": "2025-01-10T15:00:00Z",
  "end": "2025-01-10T18:00:00Z",
  "summary": "CS Project - Research (Extended)",
  "description": "Extended research session"
}
```

**Fields**:
- `eventId`: Required, Google Calendar event ID
- `start`: Optional, new start time
- `end`: Optional, new end time
- `summary`: Optional, new title
- `description`: Optional, new description

**Response** (200 OK):
```json
{
  "success": true,
  "eventId": "google_event_id_123"
}
```

**Errors**:
```json
// 400 Bad Request
{
  "error": "Event ID is required"
}

// 404 Not Found
{
  "error": "Event not found"
}
```

**Example**:
```typescript
// Used in Calendar.tsx for drag-and-drop
const handleEventDrop = async (event, newStart, newEnd) => {
  const token = localStorage.getItem('token');

  await fetch('/api/calendar/update', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      eventId: event.id,
      start: newStart.toISOString(),
      end: newEnd.toISOString()
    })
  });
};
```

---

### DELETE /api/calendar/delete

Delete a calendar event.

**Location**: `app/api/calendar/delete/route.ts`

**Headers**:
```
Authorization: Bearer <token>
```

**Query Parameters**:
- `eventId`: Google Calendar event ID

**Response** (200 OK):
```json
{
  "success": true
}
```

**Errors**:
```json
// 400 Bad Request
{
  "error": "Event ID is required"
}

// 404 Not Found
{
  "error": "Event not found"
}
```

**Example**:
```typescript
const deleteEvent = async (eventId) => {
  const token = localStorage.getItem('token');

  await fetch(`/api/calendar/delete?eventId=${eventId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
};
```

---

### GET /api/calendar/free-blocks

Find free time blocks in calendar.

**Location**: `app/api/calendar/free-blocks/route.ts`

**Headers**:
```
Authorization: Bearer <token>
```

**Query Parameters**:
- `start`: ISO 8601 datetime
- `end`: ISO 8601 datetime
- `minDuration`: Optional, minimum block duration in minutes (default: 30)

**Response** (200 OK):
```json
{
  "freeBlocks": [
    {
      "start": "2025-01-10T14:00:00Z",
      "end": "2025-01-10T17:00:00Z",
      "durationMinutes": 180
    },
    {
      "start": "2025-01-11T09:00:00Z",
      "end": "2025-01-11T12:00:00Z",
      "durationMinutes": 180
    },
    {
      "start": "2025-01-11T18:00:00Z",
      "end": "2025-01-11T21:00:00Z",
      "durationMinutes": 180
    }
  ]
}
```

**Algorithm**:
1. Fetches user preferences (study times, available days)
2. Fetches existing calendar events
3. Identifies gaps between events
4. Filters by preferred time windows (morning, midday, evening)
5. Filters by available days
6. Returns blocks >= minDuration

**Errors**:
```json
// 400 Bad Request
{
  "error": "Start and end dates are required"
}
```

**Example**:
```typescript
const findFreeTimes = async () => {
  const token = localStorage.getItem('token');
  const start = new Date().toISOString();
  const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const response = await fetch(
    `/api/calendar/free-blocks?start=${start}&end=${end}&minDuration=60`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );

  const { freeBlocks } = await response.json();
  return freeBlocks;
};
```

---

## Assignment Management

### GET /api/assignments/count

Get count of user's assignments.

**Location**: `app/api/assignments/count/route.ts`

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "count": 5
}
```

**Note**: This endpoint currently returns a placeholder count. Full implementation requires assignment tracking in database.

---

### DELETE /api/assignments/clear-all

Delete all assignments for user (debug endpoint).

**Location**: `app/api/assignments/clear-all/route.ts`

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "All assignments cleared"
}
```

**Warning**: This is a debug endpoint. Should be removed in production.

---

## Task Operations

### GET /api/tasks/count

Get count of user's tasks.

**Location**: `app/api/tasks/count/route.ts`

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "count": 12
}
```

**Note**: Currently returns placeholder count.

---

## User Preferences

### GET /api/preferences

Get user preferences.

**Location**: `app/api/preferences/route.ts` (GET handler)

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "studyTimes": {
    "morning": true,
    "midday": true,
    "evening": false
  },
  "availableDays": ["monday", "tuesday", "wednesday", "thursday", "friday"],
  "deadlineBuffer": 2,
  "subjectDifficulty": {
    "mathematics": 4,
    "history": 2,
    "computer_science": 3
  },
  "maxSessionLength": 120,
  "minSessionLength": 30
}
```

**Errors**:
```json
// 404 Not Found
{
  "error": "Preferences not found"
}
```

---

### PUT /api/preferences

Update user preferences.

**Location**: `app/api/preferences/route.ts` (PUT handler)

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request**:
```json
{
  "studyTimes": {
    "morning": true,
    "midday": true,
    "evening": false
  },
  "availableDays": ["monday", "tuesday", "wednesday", "thursday", "friday"],
  "deadlineBuffer": 2,
  "subjectDifficulty": {
    "mathematics": 4,
    "history": 2
  }
}
```

**Fields**:
- `studyTimes`: Object with `morning`, `midday`, `evening` booleans
- `availableDays`: Array of day names (lowercase)
- `deadlineBuffer`: Number of days before deadline to complete
- `subjectDifficulty`: Object mapping subject names to difficulty (1-5)
- `maxSessionLength`: Optional, max minutes per session (default: 120)
- `minSessionLength`: Optional, min minutes per session (default: 30)

**Response** (200 OK):
```json
{
  "success": true
}
```

**Example**:
```typescript
const updatePreferences = async (preferences) => {
  const token = localStorage.getItem('token');

  await fetch('/api/preferences', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(preferences)
  });
};
```

---

## Chat Operations

### DELETE /api/chat/clear

Clear chat history for user.

**Location**: `app/api/chat/clear/route.ts`

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Chat history cleared"
}
```

**Note**: Currently a placeholder. Full implementation requires chat history storage in database.

---

## Debug Endpoints

⚠️ **Warning**: These endpoints should be removed or protected in production.

### GET /api/debug/mongodb

Test MongoDB connection.

**Location**: `app/api/debug/mongodb/route.ts`

**Response** (200 OK):
```json
{
  "status": "connected",
  "database": "study-autopilot",
  "collections": ["users", "user_preferences", "assignments", "tasks"]
}
```

---

### GET /api/debug/find-user

Find user by email (debug only).

**Location**: `app/api/debug/find-user/route.ts`

**Query Parameters**:
- `email`: User email address

**Response** (200 OK):
```json
{
  "found": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "student@example.com",
    "name": "John Doe",
    "hasGoogleCalendar": true
  }
}
```

---

## WebSocket API

### Connection

**URL**: `ws://localhost:8000/chat?user_id=<userId>`

**Protocol**: WebSocket (RFC 6455)

**Location**: `backend/main.py:94-172`

**Connection Headers**: None (currently)

⚠️ **Security Issue**: No JWT validation on WebSocket connection. User ID accepted directly from query string.

---

### Message Types

#### Client → Server: User Message

```json
{
  "type": "message",
  "content": "I have a history essay due next Friday"
}
```

#### Server → Client: Assistant Message

```json
{
  "type": "message",
  "role": "assistant",
  "content": "I can help you plan that! Can you tell me more about the essay requirements?"
}
```

#### Server → Client: Function Call

```json
{
  "type": "function_call",
  "function_name": "create_assignment",
  "arguments": {
    "title": "History Essay",
    "type": "essay",
    "due_date": "2025-01-17",
    "estimated_hours": 8,
    "subject": "history"
  },
  "result": {
    "assignmentId": "507f1f77bcf86cd799439011",
    "status": "created"
  }
}
```

#### Server → Client: Error

```json
{
  "type": "error",
  "message": "Failed to create assignment",
  "details": "Database connection error"
}
```

#### Server → Client: Typing Indicator

```json
{
  "type": "typing",
  "isTyping": true
}
```

---

### AI Functions

Functions that Gemini can call via the chat interface.

#### create_assignment

```json
{
  "name": "create_assignment",
  "parameters": {
    "assignment_title": "History Essay",
    "assignment_type": "essay",
    "due_date": "2025-01-17T23:59:59Z",
    "description": "5-page essay on Renaissance art",
    "subject": "history",
    "estimated_hours": 8
  }
}
```

#### break_down_assignment

```json
{
  "name": "break_down_assignment",
  "parameters": {
    "assignment_id": "507f1f77bcf86cd799439011",
    "phases": [
      {
        "phase_name": "research",
        "tasks": [
          {
            "task_title": "Research Renaissance artists",
            "estimated_minutes": 60
          },
          {
            "task_title": "Gather sources",
            "estimated_minutes": 30
          }
        ]
      }
    ]
  }
}
```

#### schedule_tasks

```json
{
  "name": "schedule_tasks",
  "parameters": {
    "assignment_id": "507f1f77bcf86cd799439011",
    "task_ids": ["task_1", "task_2"],
    "preferences": {
      "preferred_times": ["morning", "midday"],
      "available_days": ["monday", "tuesday", "wednesday"],
      "max_session_length": 120
    }
  }
}
```

#### get_calendar_events

```json
{
  "name": "get_calendar_events",
  "parameters": {
    "start_date": "2025-01-10T00:00:00Z",
    "end_date": "2025-01-17T23:59:59Z"
  }
}
```

#### update_task_status

```json
{
  "name": "update_task_status",
  "parameters": {
    "task_id": "507f191e810c19729de860ea",
    "status": "completed"
  }
}
```

#### reschedule_task

```json
{
  "name": "reschedule_task",
  "parameters": {
    "task_id": "507f191e810c19729de860ea",
    "new_start_time": "2025-01-11T14:00:00Z",
    "new_end_time": "2025-01-11T17:00:00Z"
  }
}
```

#### get_user_assignments

```json
{
  "name": "get_user_assignments",
  "parameters": {
    "user_id": "507f1f77bcf86cd799439011",
    "filter": "active"
  }
}
```

**Filters**: `active`, `completed`, `overdue`, `all`

---

### WebSocket Example Usage

```typescript
// hooks/useWebSocket.ts usage
import { useWebSocket } from '@/hooks/useWebSocket';

function ChatComponent() {
  const { messages, sendMessage, isConnected } = useWebSocket(userId);

  const handleSend = (text: string) => {
    sendMessage({
      type: 'message',
      content: text
    });
  };

  return (
    <div>
      {messages.map((msg, i) => (
        <div key={i}>{msg.content}</div>
      ))}
      <input onSubmit={handleSend} />
    </div>
  );
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET/PUT/DELETE |
| 201 | Created | Successful POST (resource created) |
| 400 | Bad Request | Validation error, missing required fields |
| 401 | Unauthorized | Missing token, invalid token, wrong password |
| 403 | Forbidden | Valid token but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 500 | Internal Server Error | Database error, external service failure |

### Error Response Format

All errors follow this structure:

```json
{
  "error": "Human-readable error message",
  "details": "Optional additional context"
}
```

### Common Errors

#### Authentication Errors

```json
// No token provided
{
  "error": "No token provided"
}

// Invalid/expired token
{
  "error": "Invalid token"
}

// User not found
{
  "error": "User not found"
}

// Wrong password
{
  "error": "Invalid password"
}
```

#### Calendar Errors

```json
// Calendar not connected
{
  "error": "Google Calendar not connected"
}

// Event not found
{
  "error": "Event not found"
}

// Invalid date format
{
  "error": "Invalid date format. Use ISO 8601"
}
```

#### Validation Errors

```json
// Missing required fields
{
  "error": "Summary, start, and end are required"
}

// Invalid field value
{
  "error": "Password must be at least 6 characters"
}
```

---

## Rate Limiting

⚠️ **Not Currently Implemented**

**Recommended Limits** (for production):
- Authentication endpoints: 5 requests per minute
- Calendar operations: 30 requests per minute
- Chat WebSocket: 60 messages per minute
- General API: 100 requests per minute

---

## CORS Configuration

### Frontend (Next.js)

Allows requests from: `http://localhost:8000`

### Backend (FastAPI)

```python
# backend/main.py:28-33
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Production**: Update origins to production domain.

---

## API Versioning

**Current Version**: v1 (implicit, no version in URL)

**Future**: Consider versioning strategy for breaking changes:
- URL-based: `/api/v2/calendar/events`
- Header-based: `Accept: application/vnd.studyautopilot.v2+json`

---

## Testing

### cURL Examples

**Signup**:
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass","name":"Test User"}'
```

**Login**:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass"}'
```

**Get Calendar Events**:
```bash
curl -X GET "http://localhost:3000/api/calendar/events?start=2025-01-01T00:00:00Z&end=2025-01-31T23:59:59Z" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Create Calendar Event**:
```bash
curl -X POST http://localhost:3000/api/calendar/create \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Study Session",
    "description": "Math homework",
    "start": "2025-01-10T14:00:00Z",
    "end": "2025-01-10T16:00:00Z"
  }'
```

---

## Postman Collection

**To Create**:

1. Import base URL: `http://localhost:3000/api`
2. Create environment variable: `{{token}}`
3. Add all endpoints from this document
4. Configure auth header: `Authorization: Bearer {{token}}`

---

## Implementation Status

| Endpoint | Status | Notes |
|----------|--------|-------|
| POST /api/auth/signup | ✅ Complete | Working |
| POST /api/auth/login | ✅ Complete | Working |
| GET /api/auth/me | ✅ Complete | Working |
| GET /api/auth/google | ✅ Complete | Working |
| GET /api/auth/google/callback | ✅ Complete | Working |
| GET /api/calendar/events | ✅ Complete | Working |
| POST /api/calendar/create | ✅ Complete | Working |
| PUT /api/calendar/update | ✅ Complete | Working |
| DELETE /api/calendar/delete | ✅ Complete | Working |
| GET /api/calendar/free-blocks | ✅ Complete | Working |
| GET /api/assignments/count | 🚧 Partial | Placeholder |
| DELETE /api/assignments/clear-all | 🚧 Partial | Debug only |
| GET /api/tasks/count | 🚧 Partial | Placeholder |
| GET /api/preferences | ✅ Complete | Working |
| PUT /api/preferences | ✅ Complete | Working |
| DELETE /api/chat/clear | 🚧 Partial | Placeholder |
| WebSocket /chat | 🚧 Partial | No auth validation |

---

## Future API Endpoints (Planned)

### Assignments

- `POST /api/assignments` - Create assignment
- `GET /api/assignments` - List all assignments
- `GET /api/assignments/:id` - Get assignment details
- `PUT /api/assignments/:id` - Update assignment
- `DELETE /api/assignments/:id` - Delete assignment

### Tasks

- `POST /api/tasks` - Create task
- `GET /api/tasks` - List all tasks
- `GET /api/tasks/:id` - Get task details
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `PATCH /api/tasks/:id/status` - Update task status

### Analytics

- `GET /api/analytics/productivity` - Productivity metrics
- `GET /api/analytics/completion-rate` - Task completion rate
- `GET /api/analytics/time-spent` - Time spent per subject

---

## Summary

Study Autopilot's API is RESTful with WebSocket support for real-time chat. Most core features are implemented and working. Main gaps are in assignment/task CRUD operations and backend integration with AI function calls.

For implementation details, see `ARCHITECTURE.md` and `IMPLEMENTATION_STATUS.md`.
