# Study Autopilot Backend

FastAPI backend with Google Gemini AI integration for intelligent assignment breakdown and scheduling.

## Features

- **Google Gemini AI Integration**: Function calling for natural language task management
- **WebSocket Chat**: Real-time AI chat interface
- **MongoDB Atlas**: Cloud database for assignments, tasks, and chat history
- **Async Operations**: Built with FastAPI and Motor for high performance

## Prerequisites

- Python 3.12 (recommended for compatibility)
- MongoDB Atlas account (free tier available)
- Google Gemini API key (free for development)

## Setup Instructions

### 1. Create Virtual Environment

```bash
cd backend
python -m venv venv

# On Mac/Linux:
source venv/bin/activate

# On Windows:
venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Get API Keys

#### MongoDB Atlas Setup

1. Go to https://cloud.mongodb.com/
2. Create a free M0 cluster
3. Create a database user with read/write permissions
4. Network Access: Add IP `0.0.0.0/0` (allow from anywhere)
5. Get your connection string from "Connect" → "Connect your application"
6. Replace `<password>` with your database user password

#### Google Gemini API Key

1. Go to https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Select "Create API key in new project" or choose existing project
4. Copy the API key

**Note**: Gemini API is free for development with 60 requests/minute!

#### Google OAuth (for Calendar integration - optional for MVP)

1. Go to https://console.cloud.google.com/
2. Create new project "Study Autopilot"
3. Enable "Google Calendar API"
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Client Secret

### 4. Configure Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your credentials
nano .env  # or use your favorite editor
```

Required variables:
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/study-autopilot
GEMINI_API_KEY=your-gemini-api-key-here
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
JWT_SECRET=generate-with-openssl-rand-hex-32
```

Generate JWT secret:
```bash
openssl rand -hex 32
```

### 5. Run the Server

```bash
# Development mode with auto-reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Or use Python directly
python main.py
```

Server will be available at: http://localhost:8000

### 6. Test the API

Visit http://localhost:8000 for health check

API documentation: http://localhost:8000/docs (Swagger UI)

## Project Structure

```
backend/
├── ai/                          # AI integration
│   ├── functions.py            # Gemini function declarations
│   └── chat_handler.py         # Chat message processing
├── database/                    # Database operations
│   └── connection.py           # MongoDB connection
├── services/                    # Business logic
│   └── function_executor.py    # Execute AI function calls
├── routes/                      # API endpoints (TODO)
├── models/                      # Data models (TODO)
├── auth/                        # Authentication (TODO)
├── main.py                      # FastAPI application
├── requirements.txt             # Python dependencies
├── .env.example                 # Environment template
└── README.md                    # This file
```

## WebSocket Chat Protocol

### Connect

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/chat');

// Send authentication
ws.send(JSON.stringify({
  user_id: "user_123"  // TODO: Replace with proper JWT token
}));
```

### Send Message

```javascript
ws.send(JSON.stringify({
  message: "I have a 10-page research paper due November 15"
}));
```

### Receive Response

```javascript
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'connected') {
    console.log('Connected to AI');
  } else if (data.type === 'typing') {
    console.log('AI is typing...');
  } else if (data.type === 'message') {
    console.log('AI:', data.message);
    console.log('Functions called:', data.function_calls);
  }
};
```

## Available AI Functions

The AI can call these functions automatically during conversation:

1. **create_assignment** - Create new assignment
2. **break_down_assignment** - Break into subtasks with time estimates
3. **schedule_tasks** - Schedule tasks in calendar
4. **update_task_status** - Mark tasks complete/in progress
5. **get_calendar_events** - Check calendar availability (TODO)
6. **reschedule_task** - Move tasks to different times
7. **get_user_assignments** - List all assignments

## Example AI Conversation

```
User: "I have a 10-page climate policy paper due November 15"

AI: [Calls create_assignment]
    "Got it! I've created your Climate Policy paper. Let me break it down..."

AI: [Calls break_down_assignment]
    "I've broken it into 5 tasks:
     - Research and collect sources (3 hours)
     - Create outline and thesis (1 hour)
     - Write first draft (4 hours)
     - Revise and edit (2 hours)
     - Final formatting (1 hour)

     Total: 11 hours. Would you like me to schedule these?"

User: "Yes please"

AI: [Calls get_calendar_events and schedule_tasks]
    "Perfect! I've scheduled 5 study sessions over the next week.
     You can see them on your calendar."
```

## Development

### Adding New Endpoints

Create a new router in `routes/`:

```python
# routes/assignments.py
from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def list_assignments():
    return {"assignments": []}
```

Register in `main.py`:

```python
from routes import assignments
app.include_router(assignments.router, prefix="/api/assignments")
```

### Database Collections

- **users** - User profiles and preferences
- **assignments** - Assignment metadata
- **subtasks** - Individual tasks with scheduling
- **chat_messages** - Conversation history
- **calendar_sync** - Calendar synchronization data (TODO)

## TODO

- [ ] Implement Google Calendar API integration
- [ ] Add proper JWT authentication
- [ ] Create REST endpoints for assignments/tasks
- [ ] Add user preferences management
- [ ] Implement auto-rescheduling logic
- [ ] Add rate limiting
- [ ] Set up logging and monitoring
- [ ] Write unit tests

## Troubleshooting

### Windows: ModuleNotFoundError: No module named '_cffi_backend'

This error occurs when the `cffi` package (required by `cryptography`) isn't installed correctly on Windows.

**Solution 1: Reinstall dependencies (Recommended)**
```bash
# Deactivate and remove the virtual environment
deactivate
rmdir /s venv

# Create a fresh virtual environment
python -m venv venv
venv\Scripts\activate

# Upgrade pip and install dependencies
python -m pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
```

**Solution 2: Force reinstall cffi and cryptography**
```bash
# With virtual environment activated
pip install --upgrade --force-reinstall cffi
pip install --upgrade --force-reinstall cryptography
```

**Solution 3: Install Visual C++ Build Tools (if above solutions fail)**
- Download and install [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- Select "Desktop development with C++" during installation
- Restart your terminal and retry installing dependencies

### MongoDB Connection Error

- Check that your IP is whitelisted in MongoDB Atlas
- Verify the connection string format
- Ensure database user has correct permissions

### Gemini API Error

- Verify API key is correct
- Check you haven't exceeded rate limits (60 req/min free tier)
- Ensure you have a stable internet connection

### WebSocket Connection Failed

- Check that the server is running
- Verify CORS settings in `main.py`
- Check browser console for errors

## Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Google Gemini API](https://ai.google.dev/docs)
- [MongoDB Motor Driver](https://motor.readthedocs.io/)
- [WebSocket Documentation](https://fastapi.tiangolo.com/advanced/websockets/)

## License

Private and proprietary - AI ATL 2025 Hackathon
