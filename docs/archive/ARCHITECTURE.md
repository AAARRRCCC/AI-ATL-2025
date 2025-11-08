# Study Autopilot - Technical Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │ Auth (Google)│  │  Dashboard  │  │  Calendar View   │   │
│  │   OAuth      │  │  Task Cards │  │  Drag & Drop     │   │
│  └──────────────┘  └─────────────┘  └──────────────────┘   │
│                    ┌──────────────────────────────────┐     │
│                    │   AI Chatbot Interface           │     │
│                    │   (Bottom of page)               │     │
│                    └──────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ REST API / WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Backend (FastAPI)                        │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │  Auth Routes │  │ API Routes  │  │ WebSocket Chat   │   │
│  │   /auth/*    │  │ /api/*      │  │   /ws/chat       │   │
│  └──────────────┘  └─────────────┘  └──────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          AI Chat Engine (Claude API)                 │   │
│  │  - Function calling for task creation                │   │
│  │  - Natural language understanding                    │   │
│  │  - Calendar manipulation                             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────────┐   ┌──────────────┐
│  MongoDB     │    │  Google Calendar │   │  Claude API  │
│   Atlas      │    │       API        │   │              │
│              │    │                  │   │              │
│ - Users      │    │ - Read events    │   │ - Chat       │
│ - Assignments│    │ - Create events  │   │ - Function   │
│ - Tasks      │    │ - Update events  │   │   calling    │
│ - Chat logs  │    │                  │   │              │
└──────────────┘    └──────────────────┘   └──────────────┘
```

---

## Authentication Flow (Google OAuth)

### Login Process

```mermaid
sequenceDiagram
    User->>Frontend: Clicks "Sign in with Google"
    Frontend->>Google: Redirect to OAuth consent
    Google->>User: Show permissions screen
    User->>Google: Approves (Calendar + Profile access)
    Google->>Frontend: Redirect with auth code
    Frontend->>Backend: POST /auth/google/callback
    Backend->>Google: Exchange code for tokens
    Google->>Backend: Access + Refresh tokens
    Backend->>MongoDB: Store user + encrypted tokens
    Backend->>Frontend: Return session token
    Frontend->>Dashboard: Redirect to main app
```

### NextAuth.js Configuration

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/calendar",
            "https://www.googleapis.com/auth/calendar.events"
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

### Backend OAuth Verification

```python
# backend/auth/google_oauth.py
from google.oauth2 import id_token
from google.auth.transport import requests

async def verify_google_token(token: str):
    """Verify Google OAuth token"""
    try:
        idinfo = id_token.verify_oauth2_token(
            token,
            requests.Request(),
            GOOGLE_CLIENT_ID
        )

        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise ValueError('Wrong issuer.')

        return {
            "google_id": idinfo['sub'],
            "email": idinfo['email'],
            "name": idinfo['name'],
            "picture": idinfo.get('picture')
        }
    except ValueError:
        return None
```

---

## AI Chatbot Architecture

### Google Gemini Function Calling Setup

The chatbot uses Gemini's function calling to directly manipulate tasks and calendar:

```python
# backend/ai/functions.py
import google.generativeai as genai

# Function declarations for Gemini
AVAILABLE_FUNCTIONS = [
    genai.protos.FunctionDeclaration(
        name="create_assignment",
        description="Create a new assignment with a title, description, and due date",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "title": genai.protos.Schema(type=genai.protos.Type.STRING, description="Assignment title"),
                "description": genai.protos.Schema(type=genai.protos.Type.STRING, description="Assignment details"),
                "due_date": genai.protos.Schema(type=genai.protos.Type.STRING, description="Due date (YYYY-MM-DD)"),
                "difficulty": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Difficulty level",
                    enum=["easy", "medium", "hard"]
                ),
                "subject": genai.protos.Schema(type=genai.protos.Type.STRING, description="Subject/category")
            },
            required=["title", "due_date"]
        )
    ),
    genai.protos.FunctionDeclaration(
        name="break_down_assignment",
        description="Analyze an assignment and break it into subtasks with time estimates",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "assignment_id": genai.protos.Schema(type=genai.protos.Type.STRING),
                "user_context": genai.protos.Schema(
                    type=genai.protos.Type.OBJECT,
                    description="User preferences and constraints"
                )
            },
            required=["assignment_id"]
        )
    ),
    genai.protos.FunctionDeclaration(
        name="schedule_tasks",
        description="Schedule subtasks by finding free time in the user's calendar",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "assignment_id": genai.protos.Schema(type=genai.protos.Type.STRING),
                "start_date": genai.protos.Schema(type=genai.protos.Type.STRING, description="Start date (YYYY-MM-DD)"),
                "end_date": genai.protos.Schema(type=genai.protos.Type.STRING, description="End date (YYYY-MM-DD)")
            },
            required=["assignment_id"]
        )
    ),
    genai.protos.FunctionDeclaration(
        name="update_task_status",
        description="Mark a task as completed, in progress, or skipped",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "task_id": genai.protos.Schema(type=genai.protos.Type.STRING),
                "status": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    enum=["pending", "in_progress", "completed", "skipped"]
                ),
                "actual_duration": genai.protos.Schema(
                    type=genai.protos.Type.NUMBER,
                    description="Minutes spent (if completed)"
                )
            },
            required=["task_id", "status"]
        )
    ),
    genai.protos.FunctionDeclaration(
        name="get_calendar_events",
        description="Fetch the user's Google Calendar events for a date range",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "start_date": genai.protos.Schema(type=genai.protos.Type.STRING, description="Start datetime (ISO format)"),
                "end_date": genai.protos.Schema(type=genai.protos.Type.STRING, description="End datetime (ISO format)")
            },
            required=["start_date", "end_date"]
        )
    ),
    genai.protos.FunctionDeclaration(
        name="reschedule_task",
        description="Move a task to a different time slot",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "task_id": genai.protos.Schema(type=genai.protos.Type.STRING),
                "new_start": genai.protos.Schema(type=genai.protos.Type.STRING, description="New start time (ISO format)"),
                "new_end": genai.protos.Schema(type=genai.protos.Type.STRING, description="New end time (ISO format)")
            },
            required=["task_id", "new_start", "new_end"]
        )
    )
]

# Create tool with all functions
study_tool = genai.protos.Tool(function_declarations=AVAILABLE_FUNCTIONS)
```

### Chat Message Processing

```python
# backend/ai/chat_handler.py
import google.generativeai as genai
import json
from google.generativeai.types import content_types

class ChatHandler:
    def __init__(self, gemini_api_key: str):
        genai.configure(api_key=gemini_api_key)

        self.system_instruction = """
You are Study Autopilot, an AI assistant that helps students manage their assignments
and study schedule. You have access to their Google Calendar and can:

1. Create assignments and break them into manageable subtasks
2. Schedule tasks based on available time in their calendar
3. Update task statuses and track progress
4. Reschedule tasks when needed
5. Provide study advice and motivation

Always be encouraging and helpful. When breaking down assignments, be realistic
about time estimates. Consider the user's difficulty rating and existing commitments.
"""

        # Initialize Gemini model with function calling
        self.model = genai.GenerativeModel(
            model_name='gemini-1.5-pro-latest',  # or 'gemini-1.5-flash-latest' for faster responses
            tools=[study_tool],
            system_instruction=self.system_instruction
        )

    async def process_message(
        self,
        user_message: str,
        user_id: str,
        conversation_history: list
    ):
        """Process a chat message and execute any function calls"""

        # Convert conversation history to Gemini format
        gemini_history = []
        for msg in conversation_history:
            gemini_history.append({
                "role": msg["role"],
                "parts": [msg["content"]]
            })

        # Start chat session
        chat = self.model.start_chat(history=gemini_history)

        # Send message
        response = chat.send_message(user_message)

        function_results = []

        # Handle function calls in a loop
        while response.candidates[0].content.parts:
            has_function_call = False

            for part in response.candidates[0].content.parts:
                if fn := part.function_call:
                    has_function_call = True

                    # Execute the function
                    result = await self.execute_function(
                        fn.name,
                        dict(fn.args),
                        user_id
                    )

                    function_results.append({
                        "name": fn.name,
                        "input": dict(fn.args),
                        "result": result
                    })

                    # Send function response back to model
                    response = chat.send_message(
                        genai.protos.Content(
                            parts=[genai.protos.Part(
                                function_response=genai.protos.FunctionResponse(
                                    name=fn.name,
                                    response={"result": result}
                                )
                            )]
                        )
                    )

            if not has_function_call:
                break

        # Extract final text response
        final_message = ""
        for part in response.candidates[0].content.parts:
            if part.text:
                final_message += part.text

        return {
            "message": final_message,
            "function_calls": function_results
        }

    async def execute_function(self, name: str, args: dict, user_id: str):
        """Execute a function call and return results"""
        # Import function handlers
        from backend.services import assignment_service, calendar_service, task_service

        if name == "create_assignment":
            return await assignment_service.create(user_id, args)

        elif name == "break_down_assignment":
            return await assignment_service.break_down(args["assignment_id"], args.get("user_context"))

        elif name == "schedule_tasks":
            return await calendar_service.schedule_assignment_tasks(
                user_id,
                args["assignment_id"],
                args.get("start_date"),
                args.get("end_date")
            )

        elif name == "update_task_status":
            return await task_service.update_status(
                user_id,
                args["task_id"],
                args["status"],
                args.get("actual_duration")
            )

        elif name == "get_calendar_events":
            return await calendar_service.get_events(
                user_id,
                args["start_date"],
                args["end_date"]
            )

        elif name == "reschedule_task":
            return await calendar_service.reschedule_task(
                user_id,
                args["task_id"],
                args["new_start"],
                args["new_end"]
            )

        else:
            return {"error": f"Unknown function: {name}"}
```

### WebSocket Chat Endpoint

```python
# backend/routes/chat.py
from fastapi import WebSocket, WebSocketDisconnect
from backend.ai.chat_handler import ChatHandler
from backend.database import get_user_messages, save_message

chat_handler = ChatHandler(GEMINI_API_KEY)

@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    await websocket.accept()
    user_id = None

    try:
        # First message should be auth token
        auth_data = await websocket.receive_json()
        user_id = verify_session_token(auth_data["token"])

        if not user_id:
            await websocket.send_json({"error": "Unauthorized"})
            await websocket.close()
            return

        # Load conversation history
        history = await get_user_messages(user_id, limit=20)

        while True:
            # Receive message
            data = await websocket.receive_json()
            user_message = data["message"]

            # Save user message
            await save_message(user_id, "user", user_message)

            # Process with Gemini AI
            response = await chat_handler.process_message(
                user_message,
                user_id,
                history
            )

            # Save AI response
            await save_message(
                user_id,
                "model",  # Gemini uses "model" role instead of "assistant"
                response["message"],
                function_calls=response["function_calls"]
            )

            # Send response
            await websocket.send_json({
                "message": response["message"],
                "function_calls": response["function_calls"],
                "timestamp": datetime.utcnow().isoformat()
            })

            # Update history
            history.append({"role": "user", "content": user_message})
            history.append({"role": "model", "content": response["message"]})

    except WebSocketDisconnect:
        print(f"User {user_id} disconnected")
```

---

## Google Calendar Integration

### Calendar Service

```python
# backend/services/calendar_service.py
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from datetime import datetime, timedelta

class GoogleCalendarService:
    def __init__(self, user_tokens: dict):
        """Initialize with user's Google OAuth tokens"""
        creds = Credentials(
            token=user_tokens["access_token"],
            refresh_token=user_tokens["refresh_token"],
            token_uri="https://oauth2.googleapis.com/token",
            client_id=GOOGLE_CLIENT_ID,
            client_secret=GOOGLE_CLIENT_SECRET
        )
        self.service = build('calendar', 'v3', credentials=creds)

    async def get_free_time_blocks(
        self,
        start_date: datetime,
        end_date: datetime,
        min_duration_minutes: int = 45
    ):
        """Find free time blocks in the user's calendar"""

        # Get all events in the range
        events_result = self.service.events().list(
            calendarId='primary',
            timeMin=start_date.isoformat() + 'Z',
            timeMax=end_date.isoformat() + 'Z',
            singleEvents=True,
            orderBy='startTime'
        ).execute()

        events = events_result.get('items', [])

        # Find gaps between events
        free_blocks = []
        current_time = start_date

        for event in events:
            event_start = datetime.fromisoformat(event['start'].get('dateTime', event['start'].get('date')))
            event_end = datetime.fromisoformat(event['end'].get('dateTime', event['end'].get('date')))

            # Check if there's a gap before this event
            gap_duration = (event_start - current_time).total_seconds() / 60

            if gap_duration >= min_duration_minutes:
                free_blocks.append({
                    "start": current_time,
                    "end": event_start,
                    "duration_minutes": gap_duration
                })

            current_time = max(current_time, event_end)

        # Check for time after the last event
        remaining_duration = (end_date - current_time).total_seconds() / 60
        if remaining_duration >= min_duration_minutes:
            free_blocks.append({
                "start": current_time,
                "end": end_date,
                "duration_minutes": remaining_duration
            })

        return free_blocks

    async def create_study_event(
        self,
        task_id: str,
        task_title: str,
        task_description: str,
        start_time: datetime,
        end_time: datetime
    ):
        """Create a study session event in Google Calendar"""

        event = {
            'summary': f'[Study Autopilot] {task_title}',
            'description': f'{task_description}\n\nTask ID: {task_id}',
            'start': {
                'dateTime': start_time.isoformat(),
                'timeZone': 'America/New_York',  # Make this dynamic based on user
            },
            'end': {
                'dateTime': end_time.isoformat(),
                'timeZone': 'America/New_York',
            },
            'reminders': {
                'useDefault': False,
                'overrides': [
                    {'method': 'popup', 'minutes': 10},
                ],
            },
            'colorId': '9',  # Blue color for study sessions
        }

        created_event = self.service.events().insert(
            calendarId='primary',
            body=event
        ).execute()

        return created_event['id']

    async def update_event(self, event_id: str, start_time: datetime, end_time: datetime):
        """Update an existing calendar event"""

        event = self.service.events().get(
            calendarId='primary',
            eventId=event_id
        ).execute()

        event['start']['dateTime'] = start_time.isoformat()
        event['end']['dateTime'] = end_time.isoformat()

        updated_event = self.service.events().update(
            calendarId='primary',
            eventId=event_id,
            body=event
        ).execute()

        return updated_event

    async def delete_event(self, event_id: str):
        """Delete a calendar event"""
        self.service.events().delete(
            calendarId='primary',
            eventId=event_id
        ).execute()
```

---

## Drag-and-Drop Calendar Implementation

### Frontend Calendar Component

```typescript
// components/Calendar.tsx
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

const DragAndDropCalendar = withDragAndDrop(Calendar);

export function StudyCalendar({ tasks, onTaskMove }) {
  const handleEventDrop = async ({ event, start, end }) => {
    // Update task timing
    await fetch('/api/tasks/reschedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task_id: event.id,
        new_start: start,
        new_end: end
      })
    });

    onTaskMove(event.id, start, end);
  };

  const handleEventResize = async ({ event, start, end }) => {
    // Update task duration
    await fetch('/api/tasks/update-duration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task_id: event.id,
        new_start: start,
        new_end: end
      })
    });

    onTaskMove(event.id, start, end);
  };

  const events = tasks.map(task => ({
    id: task._id,
    title: task.title,
    start: new Date(task.scheduled_start),
    end: new Date(task.scheduled_end),
    resource: task
  }));

  return (
    <DndProvider backend={HTML5Backend}>
      <DragAndDropCalendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        onEventDrop={handleEventDrop}
        onEventResize={handleEventResize}
        resizable
        style={{ height: 600 }}
        eventPropGetter={(event) => ({
          style: {
            backgroundColor: event.resource.phase === 'Research' ? '#3b82f6' :
                           event.resource.phase === 'Drafting' ? '#8b5cf6' :
                           '#22c55e',
            borderRadius: '8px',
            opacity: event.resource.status === 'completed' ? 0.6 : 1
          }
        })}
      />
    </DndProvider>
  );
}
```

---

## Environment Variables

```bash
# .env.local (Frontend)
NEXT_PUBLIC_API_URL=http://localhost:8000
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
NEXT_PUBLIC_APP_URL=http://localhost:3000

# .env (Backend)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?appName=YourApp
GEMINI_API_KEY=your-gemini-api-key
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
JWT_SECRET=your-generated-jwt-secret
```

### Getting Google Gemini API Key

1. Go to https://makersuite.google.com/app/apikey (Google AI Studio)
2. Click "Create API Key"
3. Select "Create API key in new project" or choose existing Google Cloud project
4. Copy the API key
5. Add to your `.env` file as `GEMINI_API_KEY`

Note: Gemini API is free for development with generous rate limits!

---

## API Endpoints Summary

### Authentication
- `POST /auth/google/callback` - Handle Google OAuth callback
- `GET /auth/me` - Get current user info
- `POST /auth/logout` - Logout user

### Assignments
- `GET /api/assignments` - List all assignments
- `POST /api/assignments` - Create assignment (manual)
- `GET /api/assignments/:id` - Get assignment details
- `PUT /api/assignments/:id` - Update assignment
- `DELETE /api/assignments/:id` - Delete assignment

### Tasks
- `GET /api/tasks` - List tasks (with filters)
- `POST /api/tasks/:id/complete` - Mark task complete
- `POST /api/tasks/reschedule` - Reschedule task
- `PUT /api/tasks/:id` - Update task

### Calendar
- `GET /api/calendar/events` - Get Google Calendar events
- `POST /api/calendar/sync` - Force sync with Google Calendar
- `GET /api/calendar/free-blocks` - Get available time slots

### Chat
- `WS /ws/chat` - WebSocket for AI chat

---

## Deployment Configuration (For Reference)

Even though you're running localhost, here's how to deploy later:

### Frontend (Vercel)
```bash
vercel --prod
```

### Backend (Railway / Render)
```yaml
# railway.json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pip install -r requirements.txt"
  },
  "deploy": {
    "startCommand": "uvicorn main:app --host 0.0.0.0 --port $PORT",
    "healthcheckPath": "/health"
  }
}
```

### MongoDB Atlas
- Free tier: M0 (512MB storage)
- Network access: Allow from anywhere (0.0.0.0/0)
- Database user: Create with read/write permissions
