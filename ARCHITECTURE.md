# Study Autopilot - System Architecture

> Complete technical architecture and system design documentation

**Last Updated**: 2025-01-08
**Status**: Hackathon MVP - Core Systems Operational

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Diagrams](#architecture-diagrams)
4. [Authentication System](#authentication-system)
5. [AI Chatbot Architecture](#ai-chatbot-architecture)
6. [Google Calendar Integration](#google-calendar-integration)
7. [Database Schema](#database-schema)
8. [Data Flow](#data-flow)
9. [Component Architecture](#component-architecture)
10. [API Design](#api-design)
11. [WebSocket Protocol](#websocket-protocol)
12. [Security Architecture](#security-architecture)

---

## System Overview

Study Autopilot is a **hybrid full-stack application** with distinct frontend and backend services:

### Architecture Pattern
**Type**: Separated Frontend + Backend (BFF Pattern - Backend for Frontend)

```
┌─────────────────┐
│   User Browser  │
└────────┬────────┘
         │
         ├─── HTTP REST ───┐
         │                  │
         └─── WebSocket ────┤
                            │
                ┌───────────▼──────────┐
                │   Next.js Frontend   │
                │   (Port 3000)        │
                │                      │
                │   - API Routes       │
                │   - Server Actions   │
                │   - React Pages      │
                └───────────┬──────────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
         ▼                  ▼                  ▼
┌────────────────┐  ┌──────────────┐  ┌─────────────────┐
│ MongoDB Atlas  │  │   FastAPI    │  │  Google APIs    │
│                │  │   Backend    │  │                 │
│ - Users        │  │ (Port 8000)  │  │ - Calendar      │
│ - Preferences  │  │              │  │ - OAuth 2.0     │
│ - Assignments  │  │ - Gemini AI  │  │ - People        │
│ - Tasks        │  │ - WebSocket  │  └─────────────────┘
└────────────────┘  └──────────────┘
```

### Key Characteristics

- **Frontend**: Next.js 15 with App Router (React Server Components + Client Components)
- **Backend**: FastAPI (Python) for AI operations and WebSocket chat
- **Database**: MongoDB Atlas (NoSQL, cloud-hosted)
- **Real-time**: WebSocket for AI chat, REST for CRUD operations
- **AI**: Google Gemini (gemini-flash-latest) with function calling
- **External Services**: Google Calendar API, Google OAuth 2.0

---

## Technology Stack

### Frontend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 15.0.3 | React framework with App Router |
| **React** | 19.0.0-rc | UI library (concurrent features) |
| **TypeScript** | 5.x | Type safety |
| **Tailwind CSS** | 3.x | Styling |
| **Framer Motion** | 11.11.17 | Animations |
| **React Big Calendar** | 1.19.4 | Calendar UI component |
| **React DnD** | 16.0.1 | Drag-and-drop |
| **React Markdown** | 10.1.0 | Markdown rendering in chat |
| **MongoDB Driver** | 7.0.0 | Direct database access |
| **bcryptjs** | 3.0.3 | Password hashing |
| **jsonwebtoken** | 9.0.2 | JWT generation/verification |
| **googleapis** | 165.0.0 | Google Calendar API client |
| **date-fns** | 4.1.0 | Date manipulation |

### Backend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **FastAPI** | 0.104.1 | Web framework |
| **Uvicorn** | 0.24.0 | ASGI server |
| **Motor** | 3.3.2 | Async MongoDB driver |
| **google-generativeai** | 0.8.0+ | Gemini AI SDK |
| **google-auth** | 2.25.2 | Google authentication |
| **google-api-python-client** | 2.110.0 | Google APIs client |
| **python-jose** | 3.3.0 | JWT handling |
| **passlib** | 1.7.4 | Password hashing |
| **python-dotenv** | 1.0.0 | Environment variables |

### External Services

- **MongoDB Atlas**: Cloud database (free tier M0)
- **Google Gemini API**: AI language model
- **Google Calendar API**: Calendar read/write
- **Google OAuth 2.0**: User authentication

---

## Architecture Diagrams

### High-Level System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         CLIENT BROWSER                           │
│                                                                  │
│  ┌────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Landing Page  │  │   Auth Pages    │  │   Dashboard     │ │
│  │  (page.tsx)    │  │  (login/signup) │  │  (protected)    │ │
│  └────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              React Components Layer                       │  │
│  │  - Calendar  - Chat  - TaskCard  - GoogleCalendarButton  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │          Hooks & Contexts Layer                           │  │
│  │  - useWebSocket  - ThemeContext  - Auth Context          │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬─────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│   Next.js API  │ │  FastAPI       │ │  Google APIs   │
│   Routes       │ │  Backend       │ │                │
│   (REST)       │ │  (WebSocket)   │ │  - Calendar    │
│                │ │                │ │  - OAuth       │
│  /api/auth     │ │  /chat         │ └────────────────┘
│  /api/calendar │ │  /health       │
│  /api/tasks    │ │                │
└────────┬───────┘ └────────┬───────┘
         │                  │
         └─────────┬────────┘
                   │
                   ▼
         ┌─────────────────┐
         │  MongoDB Atlas  │
         │                 │
         │  - users        │
         │  - preferences  │
         │  - assignments  │
         │  - tasks        │
         └─────────────────┘
```

### Request Flow Diagram

```
User Action → Client Component → API Route/WebSocket → External Service → Database
                                                               │
                                                               └── Response ←─┘
```

**Example: Creating an Assignment via Chat**

```
1. User types "I have a CS project due Friday"
   ↓
2. ChatInput component sends message via WebSocket
   ↓
3. FastAPI backend receives message
   ↓
4. Chat handler sends to Gemini AI
   ↓
5. Gemini responds with function call: create_assignment()
   ↓
6. Function executor processes request
   ↓
7. MongoDB insert (assignments collection)
   ↓
8. Google Calendar API creates events
   ↓
9. Response sent back via WebSocket
   ↓
10. ChatMessage component displays confirmation
```

---

## Authentication System

### Authentication Flow

Study Autopilot implements **dual authentication**:
1. **Email/Password** (JWT-based)
2. **Google OAuth 2.0** (for calendar access)

#### Email/Password Authentication Flow

```
┌──────────┐                              ┌──────────────┐
│  Client  │                              │  Next.js API │
└────┬─────┘                              └──────┬───────┘
     │                                            │
     │  1. POST /api/auth/signup                 │
     │    { email, password, name }              │
     ├──────────────────────────────────────────>│
     │                                            │
     │                                            │  2. Hash password (bcrypt)
     │                                            │     10 rounds
     │                                            │
     │                                            │  3. Insert to MongoDB
     │                                            │     users collection
     │                                            │
     │                                            │  4. Generate JWT
     │                                            │     { userId, email }
     │                                            │     expires: 7d
     │                                            │
     │  5. { token, user }                       │
     │<──────────────────────────────────────────┤
     │                                            │
     │  6. Store token in localStorage           │
     │                                            │
     │                                            │
     │  7. POST /api/auth/login                  │
     │    { email, password }                    │
     ├──────────────────────────────────────────>│
     │                                            │
     │                                            │  8. Find user by email
     │                                            │
     │                                            │  9. Compare password hash
     │                                            │     bcrypt.compare()
     │                                            │
     │                                            │  10. Generate JWT
     │                                            │
     │  11. { token, user }                      │
     │<──────────────────────────────────────────┤
     │                                            │
```

**Implementation Files**:
- `app/api/auth/signup/route.ts` - User registration
- `app/api/auth/login/route.ts` - User login
- `app/api/auth/me/route.ts` - Get current user
- `lib/auth.ts` - JWT utilities, password hashing

**JWT Payload**:
```typescript
{
  userId: string,
  email: string,
  iat: number,    // issued at
  exp: number     // expiration (7 days default)
}
```

**Storage**: JWT stored in `localStorage` under key `token`

#### Google OAuth Flow

```
┌──────────┐         ┌──────────────┐         ┌──────────────┐
│  Client  │         │  Next.js API │         │  Google OAuth│
└────┬─────┘         └──────┬───────┘         └──────┬───────┘
     │                      │                        │
     │ 1. Click "Connect    │                        │
     │    Google Calendar"  │                        │
     ├─────────────────────>│                        │
     │                      │                        │
     │                      │ 2. Generate OAuth URL  │
     │                      │    with scopes:        │
     │                      │    - calendar          │
     │                      │    - calendar.events   │
     │                      │                        │
     │ 3. Redirect to       │                        │
     │    consent screen    │                        │
     │<─────────────────────┤                        │
     │                      │                        │
     │ 4. User authorizes   │                        │
     ├─────────────────────────────────────────────>│
     │                      │                        │
     │ 5. Redirect with     │                        │
     │    auth code         │                        │
     │<──────────────────────────────────────────────┤
     │                      │                        │
     │ 6. GET /api/auth/    │                        │
     │    google/callback   │                        │
     │    ?code=...         │                        │
     ├─────────────────────>│                        │
     │                      │                        │
     │                      │ 7. Exchange code for   │
     │                      │    access/refresh token│
     │                      ├───────────────────────>│
     │                      │                        │
     │                      │ 8. Tokens              │
     │                      │<───────────────────────┤
     │                      │                        │
     │                      │ 9. Store tokens in     │
     │                      │    MongoDB             │
     │                      │    users.googleTokens  │
     │                      │                        │
     │ 10. Redirect to      │                        │
     │     dashboard        │                        │
     │<─────────────────────┤                        │
```

**OAuth Scopes**:
- `https://www.googleapis.com/auth/calendar` - Read/write calendar
- `https://www.googleapis.com/auth/calendar.events` - Read/write events

**Token Storage** (in MongoDB `users` collection):
```typescript
{
  googleTokens: {
    access_token: string,
    refresh_token: string,
    expiry_date: number,
    scope: string,
    token_type: 'Bearer'
  }
}
```

**Token Refresh**: Automatic via `google-auth-library` when access token expires

**Implementation Files**:
- `app/api/auth/google/route.ts` - Initiate OAuth flow
- `app/api/auth/google/callback/route.ts` - Handle OAuth callback
- `lib/google-calendar.ts` - OAuth client creation, token management

### Protected Routes

Client-side protection pattern:

```typescript
// app/dashboard/page.tsx:27-41
useEffect(() => {
  const token = localStorage.getItem('token');
  if (!token) {
    router.push('/auth');
    return;
  }

  fetchUserData();
}, []);
```

---

## AI Chatbot Architecture

### Gemini Integration

**Model**: `gemini-flash-latest` (fast, suitable for real-time chat)

#### Chat System Components

```
┌─────────────────┐
│  ChatContainer  │  ← Main UI component
│  (components/   │
│   chat/)        │
└────────┬────────┘
         │
         │ useWebSocket hook
         │
         ▼
┌─────────────────────────────────────────┐
│  WebSocket Connection                   │
│  ws://localhost:8000/chat?user_id=...   │
└────────┬────────────────────────────────┘
         │
         │ JSON messages
         │
         ▼
┌────────────────────────────────────────┐
│  FastAPI WebSocket Endpoint            │
│  backend/main.py:94-172                │
└────────┬───────────────────────────────┘
         │
         │ Delegate to chat handler
         │
         ▼
┌────────────────────────────────────────┐
│  ChatHandler                            │
│  backend/ai/chat_handler.py            │
│                                         │
│  - Manages conversation history        │
│  - Sends to Gemini API                 │
│  - Handles function calls              │
└────────┬───────────────────────────────┘
         │
         ├── System Instruction (personality)
         │
         ├── Conversation History (context)
         │
         └── Function Declarations (tools)
                 │
                 ▼
         ┌───────────────────┐
         │   Gemini API      │
         │   (Google)        │
         └───────┬───────────┘
                 │
                 │ If function call needed
                 │
                 ▼
         ┌──────────────────────┐
         │  FunctionExecutor    │
         │  backend/services/   │
         │  function_executor.py│
         └──────────────────────┘
```

### System Instruction

**Location**: `backend/ai/chat_handler.py:23-49`

```python
SYSTEM_INSTRUCTION = """
You are Study Autopilot, an intelligent study planning assistant.

Your role:
- Help students break down assignments into manageable tasks
- Schedule work sessions based on their calendar availability
- Provide encouragement and momentum-based motivation
- Be conversational, friendly, and proactive

You have access to these functions:
- create_assignment: Break down a new assignment
- get_calendar_events: View their schedule
- schedule_tasks: Create calendar events
- update_task_status: Mark tasks complete
- reschedule_task: Move a session

Always:
1. Ask clarifying questions if assignment details are unclear
2. Consider their preferences (study times, difficulty ratings)
3. Be realistic about time estimates
4. Celebrate progress
"""
```

### Function Calling

**Declared Functions** (`backend/ai/functions.py`):

```python
[
  {
    "name": "create_assignment",
    "description": "Creates a new assignment and breaks it into phases",
    "parameters": {
      "assignment_title": str,
      "assignment_type": str,  # essay, project, exam, reading
      "due_date": str,         # ISO format
      "description": str,
      "subject": str,
      "estimated_hours": float
    }
  },
  {
    "name": "break_down_assignment",
    "description": "Breaks assignment into sub-tasks with phases",
    "parameters": {
      "assignment_id": str,
      "phases": [
        {
          "phase_name": str,  # research, drafting, revision
          "tasks": [
            {
              "task_title": str,
              "estimated_minutes": int,
              "dependencies": [str]
            }
          ]
        }
      ]
    }
  },
  {
    "name": "schedule_tasks",
    "description": "Schedules tasks in calendar based on availability",
    "parameters": {
      "assignment_id": str,
      "tasks": [task_id],
      "preferences": {
        "preferred_times": [str],  # morning, midday, evening
        "available_days": [str],   # monday, tuesday, ...
        "max_session_length": int  # minutes
      }
    }
  },
  {
    "name": "get_calendar_events",
    "description": "Fetches calendar events for date range",
    "parameters": {
      "start_date": str,
      "end_date": str
    }
  },
  {
    "name": "update_task_status",
    "description": "Marks a task as complete or incomplete",
    "parameters": {
      "task_id": str,
      "status": str  # pending, in_progress, completed
    }
  },
  {
    "name": "reschedule_task",
    "description": "Moves a task to a new time slot",
    "parameters": {
      "task_id": str,
      "new_start_time": str,
      "new_end_time": str
    }
  },
  {
    "name": "get_user_assignments",
    "description": "Gets all assignments for user",
    "parameters": {
      "user_id": str,
      "filter": str  # active, completed, overdue
    }
  }
]
```

### Function Execution Flow

```
Gemini decides to call function
         │
         ▼
FunctionExecutor.execute()
         │
         ├─ create_assignment() → MongoDB insert → Return assignment_id
         │
         ├─ schedule_tasks() → Find free blocks → Create calendar events
         │
         ├─ get_calendar_events() → Google Calendar API → Return events
         │
         └─ update_task_status() → MongoDB update → Return confirmation
```

**Status**: Function executor is partially implemented. Core logic exists but database operations need completion.

**Implementation Files**:
- `backend/ai/chat_handler.py` - Main chat logic
- `backend/ai/functions.py` - Function declarations
- `backend/services/function_executor.py` - Function execution (incomplete)

---

## Google Calendar Integration

### Calendar Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Calendar Features                          │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐│
│  │   Fetch     │  │   Create     │  │   Update      ││
│  │   Events    │  │   Events     │  │   Events      ││
│  └──────┬──────┘  └──────┬───────┘  └───────┬───────┘│
│         │                │                   │        │
└─────────┼────────────────┼───────────────────┼────────┘
          │                │                   │
          ▼                ▼                   ▼
┌──────────────────────────────────────────────────────┐
│      lib/google-calendar.ts                          │
│      (Google Calendar API Wrapper)                   │
│                                                      │
│  - OAuth client creation                             │
│  - Token refresh handling                            │
│  - Event CRUD operations                             │
│  - Free time block calculation                       │
└──────────────────────┬───────────────────────────────┘
                       │
                       │ googleapis library
                       │
                       ▼
             ┌──────────────────┐
             │  Google Calendar │
             │       API        │
             │  (calendar.v3)   │
             └──────────────────┘
```

### Calendar Operations

#### 1. Fetch Events

**Endpoint**: `app/api/calendar/events/route.ts`

```typescript
GET /api/calendar/events?start=2025-01-01T00:00:00Z&end=2025-01-31T23:59:59Z

// Response
{
  events: [
    {
      id: string,
      summary: string,
      description: string,
      start: { dateTime: string },
      end: { dateTime: string },
      colorId: string,
      extendedProperties: {
        private: {
          studyAutopilot: 'true',
          assignmentId: string,
          taskId: string,
          phase: 'research' | 'drafting' | 'revision'
        }
      }
    }
  ]
}
```

**Color Coding**:
- Research phase: `colorId: '1'` (Blue)
- Drafting phase: `colorId: '10'` (Purple)
- Revision phase: `colorId: '11'` (Green)
- Regular Google events: Gray (frontend styling)

#### 2. Create Event

**Endpoint**: `app/api/calendar/create/route.ts`

```typescript
POST /api/calendar/create
{
  summary: string,
  description: string,
  start: string,  // ISO 8601
  end: string,
  assignmentId?: string,
  taskId?: string,
  phase?: string
}

// Response
{
  eventId: string,
  htmlLink: string
}
```

#### 3. Update Event

**Endpoint**: `app/api/calendar/update/route.ts`

```typescript
PUT /api/calendar/update
{
  eventId: string,
  start: string,
  end: string,
  summary?: string,
  description?: string
}
```

#### 4. Delete Event

**Endpoint**: `app/api/calendar/delete/route.ts`

```typescript
DELETE /api/calendar/delete?eventId=abc123
```

#### 5. Find Free Time Blocks

**Endpoint**: `app/api/calendar/free-blocks/route.ts`

**Algorithm** (`lib/google-calendar.ts:170-236`):

```typescript
function findFreeTimeBlocks(
  events: CalendarEvent[],
  startDate: Date,
  endDate: Date,
  preferences: UserPreferences
): FreeBlock[] {
  // 1. Generate all possible time slots based on preferences
  //    - preferred_times: morning (8-12), midday (12-17), evening (17-22)
  //    - available_days: filter by day of week

  // 2. Sort existing events by start time

  // 3. For each day in range:
  //    a. Get preferred time windows for that day
  //    b. Check if day is in available_days
  //    c. Find gaps between events
  //    d. Filter gaps >= minimum session length (30 min)

  // 4. Return array of free blocks

  return freeBlocks;
}
```

**Response**:
```typescript
{
  freeBlocks: [
    {
      start: string,
      end: string,
      durationMinutes: number
    }
  ]
}
```

### Calendar UI Component

**Location**: `components/Calendar.tsx`

**Features**:
- React Big Calendar library
- Drag-and-drop event rescheduling
- Event resizing
- Week/Day/Month views
- Custom styling with Tailwind
- Dark mode support

**Drag-and-Drop Implementation**:

```typescript
// components/Calendar.tsx:89-128
const handleEventDrop = async ({ event, start, end }: EventDropArgs) => {
  // 1. Check if event is from Study Autopilot
  if (!event.extendedProperties?.private?.studyAutopilot) {
    toast.error('Only Study Autopilot events can be moved');
    return;
  }

  // 2. Optimistic update (update UI immediately)
  setLocalEvents(prevEvents =>
    prevEvents.map(e =>
      e.id === event.id
        ? { ...e, start, end }
        : e
    )
  );

  // 3. Call API to update in Google Calendar
  const response = await fetch('/api/calendar/update', {
    method: 'PUT',
    body: JSON.stringify({ eventId: event.id, start, end })
  });

  // 4. If failed, revert UI change
  if (!response.ok) {
    setLocalEvents(prevEvents); // Revert
    toast.error('Failed to update event');
  }
};
```

**Implementation Files**:
- `components/Calendar.tsx` - Calendar UI component
- `components/CalendarSection.tsx` - Wrapper with data fetching
- `lib/google-calendar.ts` - Google Calendar API wrapper
- `app/api/calendar/*` - Calendar API routes

---

## Database Schema

### MongoDB Collections

#### 1. `users` Collection

```typescript
{
  _id: ObjectId,
  email: string,              // Unique, indexed
  name: string,
  password: string,           // bcrypt hash
  createdAt: Date,
  googleTokens?: {
    access_token: string,
    refresh_token: string,
    expiry_date: number,
    scope: string,
    token_type: 'Bearer'
  }
}
```

**Indexes**:
- `{ email: 1 }` - Unique index for login lookups

**Implementation**: `models/User.ts`

#### 2. `user_preferences` Collection

```typescript
{
  _id: ObjectId,
  userId: ObjectId,           // Reference to users._id
  studyTimes: {
    morning: boolean,         // 8am-12pm
    midday: boolean,          // 12pm-5pm
    evening: boolean          // 5pm-10pm
  },
  availableDays: string[],    // ['monday', 'tuesday', ...]
  deadlineBuffer: number,     // Days before deadline to finish
  subjectDifficulty: {
    [subject: string]: number  // 1-5 scale
  },
  maxSessionLength: number,   // Minutes (default: 120)
  minSessionLength: number,   // Minutes (default: 30)
  updatedAt: Date
}
```

**Indexes**:
- `{ userId: 1 }` - Unique index for user lookup

**Implementation**: `models/UserPreferences.ts`

#### 3. `assignments` Collection (Planned)

```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  title: string,
  type: 'essay' | 'project' | 'exam' | 'reading' | 'other',
  subject: string,
  dueDate: Date,
  description: string,
  estimatedHours: number,
  status: 'active' | 'completed' | 'overdue',
  createdAt: Date,
  completedAt?: Date,
  phases: [
    {
      phaseId: string,
      phaseName: 'research' | 'drafting' | 'revision' | 'practice',
      estimatedMinutes: number,
      completedMinutes: number,
      status: 'pending' | 'in_progress' | 'completed'
    }
  ]
}
```

**Status**: Collection exists but schema not fully enforced

#### 4. `tasks` Collection (Planned)

```typescript
{
  _id: ObjectId,
  assignmentId: ObjectId,
  userId: ObjectId,
  phaseId: string,
  title: string,
  description: string,
  estimatedMinutes: number,
  status: 'pending' | 'in_progress' | 'completed' | 'skipped',
  scheduledStart?: Date,
  scheduledEnd?: Date,
  completedAt?: Date,
  calendarEventId?: string,   // Google Calendar event ID
  dependencies: ObjectId[],    // Other task IDs
  order: number
}
```

**Status**: Collection exists but schema not fully enforced

### Database Connection

**Frontend Connection**: `lib/mongodb.ts`

```typescript
let cachedClient: MongoClient = null;
let cachedDb: Db = null;

async function connectToDatabase() {
  if (cachedDb) return { client: cachedClient, db: cachedDb };

  const client = await MongoClient.connect(process.env.MONGODB_URI);
  const db = client.db(process.env.MONGODB_DB_NAME);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}
```

**Connection Pooling**: Default MongoDB driver pooling (min: 1, max: 10)

**Backend Connection**: `backend/database/connection.py`

```python
import motor.motor_asyncio

client = motor.motor_asyncio.AsyncIOMotorClient(os.getenv("MONGODB_URI"))
db = client[os.getenv("MONGODB_DB_NAME", "study-autopilot")]
```

---

## Data Flow

### Example: User Creates Assignment via Chat

```
1. User: "I have a history essay due next Friday, 5 pages"
   │
   ├─ Component: ChatInput
   │  ├─ Captures input
   │  └─ Sends via WebSocket: { type: 'message', content: '...' }
   │
2. WebSocket → FastAPI backend/main.py:115
   │
   ├─ ChatHandler.handle_message()
   │  ├─ Add to conversation history
   │  ├─ Send to Gemini API
   │  │
   │  └─ Gemini response:
   │     {
   │       function_call: {
   │         name: 'create_assignment',
   │         args: {
   │           title: 'History Essay',
   │           type: 'essay',
   │           due_date: '2025-01-17',
   │           estimated_hours: 8,
   │           subject: 'history'
   │         }
   │       }
   │     }
   │
3. FunctionExecutor.execute('create_assignment', args)
   │
   ├─ Insert to MongoDB.assignments:
   │  {
   │    userId: ObjectId('...'),
   │    title: 'History Essay',
   │    type: 'essay',
   │    dueDate: ISODate('2025-01-17'),
   │    estimatedHours: 8,
   │    subject: 'history',
   │    status: 'active',
   │    createdAt: ISODate('2025-01-10'),
   │    phases: [
   │      { phaseName: 'research', estimatedMinutes: 180 },
   │      { phaseName: 'drafting', estimatedMinutes: 240 },
   │      { phaseName: 'revision', estimatedMinutes: 60 }
   │    ]
   │  }
   │
   ├─ Return: { assignmentId: '...' }
   │
4. Gemini calls schedule_tasks()
   │
   ├─ GET /api/calendar/free-blocks
   │  ├─ Fetch user preferences
   │  ├─ Fetch existing calendar events
   │  ├─ Calculate free time blocks
   │  └─ Return: [{ start, end, durationMinutes }]
   │
   ├─ For each phase:
   │  ├─ Find suitable free block
   │  └─ POST /api/calendar/create
   │     {
   │       summary: 'History Essay - Research',
   │       start: '2025-01-11T14:00:00Z',
   │       end: '2025-01-11T17:00:00Z',
   │       assignmentId: '...',
   │       phase: 'research'
   │     }
   │
   └─ Return: { scheduledCount: 3 }
   │
5. ChatHandler sends response to client:
   "I've created your history essay assignment and scheduled 3 study sessions:
   - Research: Friday 2-5pm
   - Drafting: Monday 3-7pm
   - Revision: Wednesday 6-7pm"
   │
6. ChatMessage component renders response
   │
7. CalendarSection refetches events
   │
8. User sees new events in calendar
```

---

## Component Architecture

### Page Components

```
app/
├── page.tsx                    # Landing page
│   ├── AnimatedBackground
│   ├── HeroSection
│   ├── FeaturesSection
│   ├── DemoSection
│   ├── CTASection
│   └── Footer
│
├── auth/page.tsx               # Login/Signup
│   ├── Auth form (inline)
│   └── ThemeToggle
│
├── dashboard/page.tsx          # Main dashboard (protected)
│   ├── User info card
│   ├── Stats cards (assignments, sessions)
│   ├── CalendarSection
│   │   └── Calendar
│   ├── ChatContainer
│   │   ├── ChatMessage (multiple)
│   │   ├── TypingIndicator
│   │   └── ChatInput
│   └── GoogleCalendarButton
│
└── preferences/page.tsx        # User settings
    └── Preferences form (inline)
```

### Shared Components

```
components/
├── Calendar.tsx                # Drag-drop calendar
├── CalendarSection.tsx         # Calendar + data fetching
├── TaskCard.tsx                # Task display
├── ThemeToggle.tsx             # Dark/light mode button
├── GoogleCalendarButton.tsx    # OAuth connect button
├── chat/
│   ├── ChatContainer.tsx      # Main chat UI
│   ├── ChatInput.tsx          # Message input
│   ├── ChatMessage.tsx        # Message bubble with markdown
│   └── TypingIndicator.tsx    # Loading dots
└── ui/
    ├── Modal.tsx              # Generic modal
    └── ConfirmDialog.tsx      # Confirmation dialog
```

### Hooks

```
hooks/
└── useWebSocket.ts            # WebSocket connection management
    ├── Connects to ws://localhost:8000/chat
    ├── Auto-reconnect on disconnect
    ├── Message sending
    └── Event listeners
```

### Contexts

```
contexts/
└── ThemeContext.tsx           # Theme state management
    ├── Provides: theme ('light' | 'dark')
    ├── Provides: toggleTheme()
    └── Persists to localStorage
```

---

## API Design

### RESTful Endpoints

**Base URL**: `http://localhost:3000/api`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/signup` | Create new user | No |
| POST | `/auth/login` | Login user | No |
| GET | `/auth/me` | Get current user | Yes (JWT) |
| GET | `/auth/google` | Start OAuth flow | Yes |
| GET | `/auth/google/callback` | OAuth callback | No |
| GET | `/calendar/events` | Get calendar events | Yes |
| POST | `/calendar/create` | Create event | Yes |
| PUT | `/calendar/update` | Update event | Yes |
| DELETE | `/calendar/delete` | Delete event | Yes |
| GET | `/calendar/free-blocks` | Find free time | Yes |
| GET | `/assignments/count` | Count assignments | Yes |
| DELETE | `/assignments/clear-all` | Clear all (debug) | Yes |
| GET | `/tasks/count` | Count tasks | Yes |
| DELETE | `/chat/clear` | Clear chat history | Yes |
| GET | `/preferences/route` | Get preferences | Yes |
| PUT | `/preferences/route` | Update preferences | Yes |

### Authentication Header

```typescript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

**Token Source**: `localStorage.getItem('token')`

### Error Response Format

```typescript
{
  error: string,
  details?: any
}
```

**HTTP Status Codes**:
- `200` - Success
- `201` - Created
- `400` - Bad request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `404` - Not found
- `500` - Server error

---

## WebSocket Protocol

### Connection

```
ws://localhost:8000/chat?user_id=<userId>
```

**Note**: Currently no JWT validation on WebSocket (security issue flagged in backend/main.py:95-96)

### Message Format

**Client → Server**:
```json
{
  "type": "message",
  "content": "I have a project due next week"
}
```

**Server → Client**:
```json
{
  "type": "message",
  "role": "assistant",
  "content": "I can help you with that! What's the project about?"
}
```

**Server → Client (Function Call)**:
```json
{
  "type": "function_call",
  "function_name": "create_assignment",
  "arguments": {
    "title": "Project",
    "due_date": "2025-01-17",
    ...
  }
}
```

**Server → Client (Error)**:
```json
{
  "type": "error",
  "message": "Failed to create assignment",
  "details": "..."
}
```

### Connection Lifecycle

```
1. Client connects: new WebSocket(url)
   │
2. Server accepts connection
   │
3. Client sends messages
   │
4. Server streams responses (may be chunked)
   │
5. Client closes: ws.close()
   │
6. Server cleanup
```

**Auto-Reconnect**: Implemented in `hooks/useWebSocket.ts` (3-second delay)

---

## Security Architecture

**Note**: 🎪 This project is optimized for local hackathon demonstration. Security is intentionally simplified for rapid feature development.

### Current Security Measures

1. **Password Hashing**:
   - bcrypt with 10 salt rounds
   - Passwords never stored in plain text
   - ✅ Production-ready

2. **JWT Authentication**:
   - 7-day expiration
   - Signed with secret key (256-bit recommended)
   - Verified on each protected endpoint
   - ✅ Production-ready

3. **Google OAuth**:
   - Standard OAuth 2.0 flow
   - Tokens stored in database
   - Auto-refresh on expiration
   - ✅ Production-ready

4. **CORS**:
   - Configured for localhost (development)
   - ⚠️ Update for production domain

5. **Input Validation**:
   - Email format validation
   - Password length requirements (6+ chars)
   - Required field validation
   - ⚠️ Basic validation only

### Simplified for Demo (Acceptable for Local)

⚠️ **WebSocket Authentication**:
- **Current**: User ID accepted in query string (`backend/main.py:95-96`)
- **Why Acceptable**: Local demo only, trusted environment
- **For Production**: Add JWT verification before public deployment

⚠️ **Token Storage**:
- **Current**: JWT in localStorage
- **Why Acceptable**: Standard practice for client-side apps, works perfectly for demo
- **For Production**: Consider HttpOnly cookies (optional improvement)

⚠️ **Debug Logging**:
- **Current**: Console.log statements in `lib/google-calendar.ts`
- **Why Acceptable**: Helpful for troubleshooting during demo prep
- **For Production**: Make conditional on environment

⚠️ **No Rate Limiting**:
- **Current**: No rate limits on API routes
- **Why Acceptable**: No abuse risk in local development
- **For Production**: Add rate limiting middleware

⚠️ **Basic Input Sanitization**:
- **Current**: Minimal input sanitization
- **Why Acceptable**: Trusted inputs in demo environment
- **For Production**: Implement comprehensive sanitization

### Future Production Hardening

**Post-Hackathon Checklist** (not needed for demo):

- [ ] Add WebSocket JWT validation
- [ ] Implement rate limiting
- [ ] Comprehensive input sanitization
- [ ] CSRF protection
- [ ] Security headers (Helmet.js)
- [ ] HTTPS enforcement
- [ ] Token rotation
- [ ] Request signing
- [ ] WAF setup
- [ ] Security monitoring
- [ ] Audit logging

**Timeline**: Address before public deployment, estimate 6-8 hours

**Philosophy**: Build features first, harden security before going live. Perfect for hackathon timeline!

---

## File Locations Reference

### Frontend

| Feature | File Path |
|---------|-----------|
| Landing page | `app/page.tsx` |
| Auth page | `app/auth/page.tsx` |
| Dashboard | `app/dashboard/page.tsx` |
| Preferences | `app/preferences/page.tsx` |
| Auth API | `app/api/auth/*/route.ts` |
| Calendar API | `app/api/calendar/*/route.ts` |
| Calendar component | `components/Calendar.tsx` |
| Chat components | `components/chat/*.tsx` |
| WebSocket hook | `hooks/useWebSocket.ts` |
| Auth utilities | `lib/auth.ts` |
| Calendar utilities | `lib/google-calendar.ts` |
| Database connection | `lib/mongodb.ts` |
| User model | `models/User.ts` |
| Preferences model | `models/UserPreferences.ts` |

### Backend

| Feature | File Path |
|---------|-----------|
| FastAPI app | `backend/main.py` |
| Chat handler | `backend/ai/chat_handler.py` |
| Function declarations | `backend/ai/functions.py` |
| Function executor | `backend/services/function_executor.py` |
| Database connection | `backend/database/connection.py` |
| Requirements | `backend/requirements.txt` |

---

## Summary

Study Autopilot is a well-architected full-stack application with clear separation between frontend (Next.js) and backend (FastAPI) services. The system leverages modern technologies (React 19, Next.js 15, Gemini AI, MongoDB Atlas) to provide an intelligent study planning experience.

**Strengths**:
- Clean architecture with separation of concerns
- Real-time AI chat via WebSocket
- Comprehensive Google Calendar integration
- Professional UI with dark mode
- Solid authentication system

**Areas for Improvement**:
- Complete backend function executor
- Fix WebSocket authentication
- Add comprehensive testing
- Implement missing database operations
- Production security hardening

For implementation details, see `IMPLEMENTATION_STATUS.md` and `TODO.md`.
