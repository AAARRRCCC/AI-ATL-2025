# Gemini AI Backend Integration - Complete Guide

## 🎉 What Was Built

This branch implements a **fully functional Google Gemini AI backend** for Study Autopilot with:

- ✅ **Real-time WebSocket chat** with Gemini AI
- ✅ **Function calling** - AI can create assignments, break them down, and manage tasks
- ✅ **MongoDB database** for persistent storage
- ✅ **7 AI functions** for assignment management
- ✅ **Intelligent task breakdown** by assignment type (papers, problem sets, etc.)
- ✅ **Difficulty multipliers** for time estimates

## 🚀 Working Demo

**Test input:** "I have a 10-page climate policy paper due November 15"

**AI response:**
- Creates assignment in database
- Breaks it into 5 subtasks (Research → Drafting → Revision)
- Estimates 11 hours total with 25% buffer
- Provides detailed breakdown by phase

## 📁 Files Created/Modified

```
backend/
├── ai/
│   ├── functions.py          # 7 Gemini function declarations (glm.FunctionDeclaration)
│   └── chat_handler.py       # ChatHandler class for Gemini API
├── database/
│   └── connection.py         # MongoDB async operations with Motor
├── services/
│   └── function_executor.py  # Executes AI function calls
├── main.py                   # FastAPI app with WebSocket endpoint
├── requirements.txt          # Python dependencies
├── .env.example             # Environment variables template
├── README.md                # Setup instructions
├── list_models.py           # Utility to list available Gemini models
└── GEMINI_INTEGRATION.md    # This file
```

## 🔧 Tech Stack

- **FastAPI** 0.104.1 - Async web framework
- **google-generativeai** >=0.8.0 - Gemini API client
- **motor** 3.3.2 - Async MongoDB driver
- **WebSockets** 12.0 - Real-time communication
- **Python** 3.12 - Runtime

## 🎯 AI Functions Implemented

The AI can call these functions automatically during conversation:

1. **create_assignment** - Create new assignment with title, due date, difficulty
2. **break_down_assignment** - Analyze and create subtasks with time estimates
3. **schedule_tasks** - Schedule tasks in calendar (placeholder for Google Calendar)
4. **update_task_status** - Mark tasks as complete/in progress/skipped
5. **get_calendar_events** - Fetch calendar events (placeholder)
6. **reschedule_task** - Move tasks to different times
7. **get_user_assignments** - List all assignments with status

## 📊 Database Schema

### Collections

**assignments**
```javascript
{
  _id: ObjectId,
  user_id: String,
  title: String,
  description: String,
  due_date: Date,
  difficulty_level: "easy" | "medium" | "hard",
  subject: String,
  total_estimated_hours: Number,
  status: "not_started" | "in_progress" | "completed",
  created_at: Date,
  updated_at: Date,
  created_by: "ai_chat" | "user"
}
```

**subtasks**
```javascript
{
  _id: ObjectId,
  assignment_id: ObjectId,
  user_id: String,
  title: String,
  description: String,
  estimated_duration: Number, // minutes
  order_index: Number,
  phase: String, // "Research", "Drafting", "Revision"
  status: "pending" | "scheduled" | "in_progress" | "completed",
  actual_duration: Number,
  scheduled_start: Date,
  scheduled_end: Date,
  created_at: Date
}
```

**chat_messages**
```javascript
{
  _id: ObjectId,
  user_id: String,
  role: "user" | "model",
  content: String,
  function_calls: Array, // Optional
  timestamp: Date
}
```

## 🔌 API Endpoints

### REST Endpoints

**GET /** - Health check
```json
{
  "status": "ok",
  "service": "Study Autopilot API",
  "version": "1.0.0",
  "timestamp": "2025-11-08T04:00:08.012068"
}
```

**GET /health** - Detailed health check
```json
{
  "status": "healthy",
  "database": "connected",
  "gemini_configured": true,
  "timestamp": "2025-11-08T04:00:41.298313"
}
```

### WebSocket Endpoint

**WS /ws/chat** - Real-time AI chat

**Connection flow:**

1. **Connect:** `ws://localhost:8000/ws/chat`

2. **Send auth** (first message):
```json
{
  "user_id": "user_123"
}
```

3. **Receive confirmation:**
```json
{
  "type": "connected",
  "message": "Connected to Study Autopilot AI"
}
```

4. **Send message:**
```json
{
  "message": "I have a 10-page climate policy paper due November 15"
}
```

5. **Receive typing indicator:**
```json
{
  "type": "typing",
  "message": "AI is thinking..."
}
```

6. **Receive AI response:**
```json
{
  "type": "message",
  "message": "AI response text...",
  "function_calls": [
    {
      "name": "create_assignment",
      "input": {"title": "Climate Policy Research Paper", ...},
      "result": {"success": true, "assignment_id": "..."}
    },
    {
      "name": "break_down_assignment",
      "input": {"assignment_id": "..."},
      "result": {"success": true, "subtasks": [...], "total_hours": 11}
    }
  ],
  "timestamp": "2025-11-08T04:01:23.456789"
}
```

## 🛠️ Setup Instructions

### 1. Prerequisites

- Python 3.12 (not 3.14!)
- MongoDB Atlas account (free tier)
- Google Gemini API key (free)

### 2. Install Dependencies

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```bash
# MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/study-autopilot

# Get from https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your-gemini-api-key-here

# Google OAuth (optional for MVP)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Generate with: python -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET=your-jwt-secret-key

# Server config
FRONTEND_URL=http://localhost:3000
```

### 4. Run Server

```bash
uvicorn main:app --reload
```

Server runs at: **http://localhost:8000**

## 🧪 Testing

### Quick Test (Browser)

1. Visit http://localhost:8000 - should see API info
2. Visit http://localhost:8000/health - should see all green

### WebSocket Test

Create `test_chat.html`:

```html
<!DOCTYPE html>
<html>
<body>
<h1>Study Autopilot Chat Test</h1>
<div id="messages" style="height: 400px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; margin-bottom: 10px;"></div>
<input id="input" type="text" placeholder="Type a message..." style="width: 400px">
<button onclick="send()">Send</button>

<script>
const ws = new WebSocket('ws://localhost:8000/ws/chat');
const messages = document.getElementById('messages');

ws.onopen = () => {
  console.log('Connected');
  ws.send(JSON.stringify({ user_id: "test_user_123" }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);

  if (data.type === 'message') {
    messages.innerHTML += `<p><strong>AI:</strong> ${data.message}</p>`;
    if (data.function_calls) {
      messages.innerHTML += `<p><em>Functions called: ${data.function_calls.map(f => f.name).join(', ')}</em></p>`;
    }
  } else {
    messages.innerHTML += `<p><em>${data.message || JSON.stringify(data)}</em></p>`;
  }
  messages.scrollTop = messages.scrollHeight;
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
  messages.innerHTML += `<p style="color: red;">Error: ${error}</p>`;
};

function send() {
  const input = document.getElementById('input');
  const message = input.value;
  ws.send(JSON.stringify({ message: message }));
  messages.innerHTML += `<p><strong>You:</strong> ${message}</p>`;
  input.value = '';
  messages.scrollTop = messages.scrollHeight;
}

document.getElementById('input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') send();
});
</script>
</body>
</html>
```

**Test messages:**
- "I have a 10-page climate policy paper due November 15"
- "I have a physics problem set with 10 questions due next Friday"
- "Show me all my assignments"

## 🔗 Frontend Integration Guide

### Next.js WebSocket Client

```typescript
// lib/websocket.ts
import { useEffect, useRef, useState } from 'react';

export function useStudyAutopilot(userId: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to WebSocket
    ws.current = new WebSocket('ws://localhost:8000/ws/chat');

    ws.current.onopen = () => {
      console.log('Connected to Study Autopilot');
      ws.current?.send(JSON.stringify({ user_id: userId }));
      setIsConnected(true);
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'message') {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: data.message,
          functionCalls: data.function_calls,
          timestamp: data.timestamp
        }]);
      }
    };

    ws.current.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      ws.current?.close();
    };
  }, [userId]);

  const sendMessage = (message: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ message }));
      setMessages((prev) => [...prev, {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      }]);
    }
  };

  return { messages, sendMessage, isConnected };
}
```

### Usage in Component

```typescript
// components/ChatInterface.tsx
'use client';

import { useState } from 'react';
import { useStudyAutopilot } from '@/lib/websocket';

export function ChatInterface({ userId }: { userId: string }) {
  const [input, setInput] = useState('');
  const { messages, sendMessage, isConnected } = useStudyAutopilot(userId);

  const handleSend = () => {
    if (input.trim()) {
      sendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
            <div className={`inline-block p-3 rounded-lg ${
              msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}>
              {msg.content}
            </div>
            {msg.functionCalls && (
              <div className="text-xs text-gray-500 mt-1">
                Functions: {msg.functionCalls.map(f => f.name).join(', ')}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Tell me about your assignment..."
            className="flex-1 border rounded-lg px-4 py-2"
            disabled={!isConnected}
          />
          <button
            onClick={handleSend}
            disabled={!isConnected}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            Send
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
      </div>
    </div>
  );
}
```

## 🔐 Security Notes

**Current Implementation (MVP):**
- Simple `user_id` authentication (NOT SECURE for production)
- No JWT validation yet
- MongoDB connection string in .env

**TODO for Production:**
- Implement proper JWT authentication
- Add rate limiting
- Validate all user inputs
- Encrypt MongoDB tokens
- Add HTTPS/WSS
- Implement proper session management

## 🐛 Troubleshooting

### Common Issues

**1. "404 models/gemini-1.5-pro not found"**
- Solution: Use `gemini-flash-latest` model name
- Run `python list_models.py` to see available models

**2. "Protocol message Schema has no 'type' field"**
- Solution: Use `glm.FunctionDeclaration` format (not dictionaries)
- Requires google-generativeai >= 0.8.0

**3. "MongoDB connection failed"**
- Check MONGODB_URI in .env
- Verify IP whitelist in MongoDB Atlas (0.0.0.0/0 for dev)
- Test connection string

**4. "Python 3.14 errors with protobuf"**
- Solution: Use Python 3.12
- Protobuf doesn't support Python 3.14 yet

## 📈 Next Steps for Integration

### Immediate (Connect Frontend)

1. **Add WebSocket client** to Next.js frontend
2. **Create chat UI** component
3. **Display assignments** from database
4. **Show task breakdown** visually
5. **Add calendar view** for scheduled tasks

### Phase 2 (Google Calendar Integration)

1. Implement Google OAuth flow in frontend
2. Connect Google Calendar API in backend
3. Implement actual calendar event creation
4. Add calendar sync functionality

### Phase 3 (Enhanced Features)

1. Drag-and-drop task rescheduling
2. Progress tracking dashboard
3. Auto-rescheduling when tasks are missed
4. Learning from user completion patterns
5. Multiple assignment management

## 📝 Git Branch Info

**Branch:** `claude/setup-gemini-integration-011CUucxwFpL9oNQLVM3zew2`

**Key Commits:**
- Initial backend structure with Gemini function declarations
- MongoDB database layer with async operations
- ChatHandler with function calling support
- Fixed Gemini API compatibility (0.8+ with glm.FunctionDeclaration)
- Updated to gemini-flash-latest model

**Ready to Merge:**
- ✅ All features working
- ✅ Tested with WebSocket client
- ✅ Documentation complete
- ✅ No breaking changes to main

## 🎯 Merge Strategy

### Option 1: Merge to Main
```bash
git checkout main
git merge claude/setup-gemini-integration-011CUucxwFpL9oNQLVM3zew2
git push origin main
```

### Option 2: Create Integration Branch
```bash
git checkout -b integration/frontend-backend
git merge claude/setup-gemini-integration-011CUucxwFpL9oNQLVM3zew2
git merge <frontend-branch>
# Resolve conflicts if any
git push origin integration/frontend-backend
```

## 📞 Support

**Test the integration:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your keys
uvicorn main:app --reload
```

Then open the test HTML file in a browser!

---

**Built with 🚀 by the Study Autopilot team for AI ATL 2025 Hackathon**
