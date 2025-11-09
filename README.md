# SteadyStudy

> AI-Powered Study Planning System for Students | AI ATL 2025 Hackathon

SteadyStudy is an intelligent study planning application that uses AI to break down assignments into manageable tasks, automatically schedules them based on Google Calendar availability, and provides a conversational interface for managing your academic workload. Built with Next.js 15, FastAPI, and Google Gemini AI.

## 🎪 Demo Mode

**⚡ This project is optimized for local hackathon demonstration**

- **Focus**: Feature-rich, impressive demo over production security
- **Deployment**: Local only (no public hosting)
- **Security**: Intentionally simplified for rapid development
- **Target**: Show judges what AI-powered study planning can do!

**Quick Demo Setup**: See `DEMO.md` for step-by-step presentation guide

---

## 🎯 Project Status

**Phase**: Hackathon MVP - Demo Focused

**What's Working**:
- ✅ User authentication (JWT + Google OAuth)
- ✅ AI chatbot with Gemini (WebSocket-based)
- ✅ Google Calendar integration (read/write events)
- ✅ Interactive drag-and-drop calendar
- ✅ User preferences system
- ✅ Dark/light theme support
- ✅ Professional landing page

**What's In Progress**:
- 🚧 Backend function executor (AI → database operations)
- 🚧 Task management UI
- 🚧 Auto-rescheduling logic

**See**: `IMPLEMENTATION_STATUS.md` for detailed feature breakdown

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (using v20.x recommended)
- **Python** 3.11 or 3.12 (avoid 3.14 - dependency issues)
- **MongoDB Atlas** account (free tier)
- **Google Cloud Console** project (for OAuth + Calendar API)
- **Google Gemini API** key

### Environment Setup

1. **Clone and install frontend dependencies**:
```bash
npm install --legacy-peer-deps
```
*Note: `--legacy-peer-deps` required due to React 19 RC*

2. **Set up frontend environment variables**:

Create `.env.local` in project root:
```env
MONGODB_URI=mongodb+srv://your-cluster.mongodb.net/
MONGODB_DB_NAME=study-autopilot
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. **Set up backend**:
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
```

4. **Set up backend environment variables**:

Create `backend/.env`:
```env
MONGODB_URI=mongodb+srv://your-cluster.mongodb.net/
GEMINI_API_KEY=your-gemini-api-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
JWT_SECRET=your-secret-key-min-32-chars
HOST=0.0.0.0
PORT=8000
FRONTEND_URL=http://localhost:3000
ENVIRONMENT=development
```

### Running the Application

**Terminal 1 - Frontend**:
```bash
npm run dev
```
→ http://localhost:3000

**Terminal 2 - Backend**:
```bash
cd backend
venv\Scripts\activate
python main.py
```
→ http://localhost:8000

### First-Time Setup

1. Visit http://localhost:3000
2. Click "Get Started" → Sign up with email/password
3. Go to Dashboard → Connect Google Calendar
4. Set your preferences (study times, available days)
5. Start chatting with the AI to create assignments

---

## 🏗️ Tech Stack

### Frontend
- **Next.js 15.0.3** - React framework with App Router
- **React 19 RC** - Latest React with concurrent features
- **TypeScript** - Type safety throughout
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Animations and transitions
- **React Big Calendar** - Drag-and-drop calendar component
- **React Markdown** - Rich message rendering in chat
- **MongoDB Driver** - Direct database access from API routes

### Backend
- **FastAPI 0.104.1** - Modern Python web framework
- **Uvicorn** - ASGI server with WebSocket support
- **Google Generative AI** - Gemini API for chat and function calling
- **Motor** - Async MongoDB driver
- **Python-Jose** - JWT token handling
- **Passlib + Bcrypt** - Password hashing

### Services & APIs
- **MongoDB Atlas** - NoSQL database (cloud)
- **Google Gemini** - AI language model (gemini-flash-latest)
- **Google Calendar API** - Calendar read/write operations
- **Google OAuth 2.0** - User authentication and authorization

---

## 📁 Project Structure

```
AI ATL 2025/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes (Next.js endpoints)
│   │   ├── auth/                 # Authentication endpoints
│   │   │   ├── login/           # POST - User login
│   │   │   ├── signup/          # POST - User registration
│   │   │   ├── me/              # GET - Current user info
│   │   │   └── google/          # Google OAuth flow
│   │   ├── calendar/            # Calendar operations
│   │   │   ├── events/          # GET - Fetch calendar events
│   │   │   ├── create/          # POST - Create event
│   │   │   ├── update/          # PUT - Update event
│   │   │   ├── delete/          # DELETE - Delete event
│   │   │   └── free-blocks/     # GET - Find free time slots
│   │   ├── assignments/         # Assignment management
│   │   ├── tasks/               # Task operations
│   │   ├── chat/                # Chat utilities
│   │   └── preferences/         # User preferences CRUD
│   ├── auth/                     # Auth page (login/signup UI)
│   ├── dashboard/                # Main dashboard (protected)
│   ├── preferences/              # User settings page
│   ├── layout.tsx                # Root layout with providers
│   ├── page.tsx                  # Landing page
│   └── globals.css               # Global styles + Tailwind
│
├── backend/                      # FastAPI Backend
│   ├── ai/
│   │   ├── chat_handler.py      # Gemini chat integration
│   │   └── functions.py         # AI function declarations
│   ├── auth/                     # Auth utilities
│   ├── database/
│   │   └── connection.py        # MongoDB connection
│   ├── models/                   # Pydantic models
│   ├── routes/                   # API routes (planned, not impl)
│   ├── services/
│   │   └── function_executor.py # Executes AI function calls
│   ├── main.py                   # FastAPI app + WebSocket
│   └── requirements.txt
│
├── components/                   # React Components
│   ├── Calendar.tsx              # Drag-drop calendar
│   ├── CalendarSection.tsx       # Calendar wrapper with events
│   ├── GoogleCalendarButton.tsx  # OAuth connection button
│   ├── TaskCard.tsx              # Task display card
│   ├── ThemeToggle.tsx           # Dark/light mode switcher
│   ├── chat/                     # Chat UI components
│   │   ├── ChatContainer.tsx    # Main chat interface
│   │   ├── ChatInput.tsx        # Message input field
│   │   ├── ChatMessage.tsx      # Message bubble
│   │   └── TypingIndicator.tsx  # Loading animation
│   └── ui/                       # Reusable UI components
│       ├── Modal.tsx
│       └── ConfirmDialog.tsx
│
├── contexts/
│   └── ThemeContext.tsx          # Global theme state
│
├── hooks/
│   └── useWebSocket.ts           # WebSocket connection hook
│
├── lib/                          # Utilities
│   ├── auth.ts                   # JWT + bcrypt helpers
│   ├── google-calendar.ts        # Google Calendar API wrapper
│   ├── mongodb.ts                # MongoDB connection + client
│   └── utils.ts                  # General utilities
│
├── models/                       # TypeScript Models
│   ├── User.ts                   # User data model
│   └── UserPreferences.ts        # Preferences model
│
└── docs/                         # Documentation
    ├── archive/                  # Old documentation (reference)
    ├── ARCHITECTURE.md           # System architecture
    ├── API_REFERENCE.md          # Complete API documentation
    ├── IMPLEMENTATION_STATUS.md  # Feature status tracking
    ├── DEVELOPMENT.md            # Development guide
    └── TODO.md                   # Prioritized task list
```

---

## 📚 Documentation

**Essential Docs** (Start Here):
- **README.md** (this file) - Overview and quick start
- **IMPLEMENTATION_STATUS.md** - What's implemented, what's not
- **TODO.md** - Prioritized task list

**Technical Docs**:
- **ARCHITECTURE.md** - System design, data flow, authentication
- **API_REFERENCE.md** - Complete endpoint documentation
- **DEVELOPMENT.md** - How to add features, development patterns

**Archived Docs** (Reference):
- `docs/archive/` - Original hackathon planning docs

---

## 🎮 Demo Flow (For Judges/Testing)

1. **Landing Page**: Professional hero with animated background
2. **Sign Up**: Create account with email/password
3. **Connect Calendar**: OAuth flow to link Google Calendar
4. **Set Preferences**: Choose study times and available days
5. **Chat with AI**: "I have a research paper due next Friday"
6. **AI Breaks Down Task**: Creates phases (research, draft, revise)
7. **View Calendar**: See auto-scheduled study sessions
8. **Drag to Reschedule**: Move sessions in calendar
9. **Track Progress**: Mark tasks complete, see momentum build

---

## 🔑 Key Features Explained

### AI Chat with Function Calling
- Conversational interface powered by Gemini
- AI can call functions to create assignments, schedule tasks, query calendar
- System instruction optimized for study planning domain
- Real-time via WebSocket

### Smart Scheduling
- Analyzes Google Calendar for free time blocks
- Respects user preferences (time of day, available days)
- Considers assignment difficulty and phases
- Color-codes by task type (research, drafting, revision)

### Calendar Integration
- Two-way sync with Google Calendar
- Drag-and-drop rescheduling
- Only SteadyStudy events are draggable (not Google events)
- Event resizing supported

### Theme System
- Dark/light mode toggle with smooth transitions
- Persistent preference (localStorage)
- System preference detection

---

## 💡 Future Production Considerations

**Note**: These are intentionally simplified for local demo. Address post-hackathon if deploying publicly.

### For Production Deployment
- **WebSocket Authentication** (`backend/main.py:95-96`)
  - Currently accepts user_id directly (fine for local demo)
  - Add JWT verification before public deployment

### Debug & Logging
- **Console Logging** (`lib/google-calendar.ts`)
  - DEBUG logs helpful during demo development
  - Make conditional on environment for production

### Feature Completion
- **Backend Function Executor** (`backend/services/function_executor.py`)
  - Core logic present, database operations in progress
  - See `TODO.md` for completion roadmap

---

## 🛠️ Development Commands

```bash
# Frontend
npm run dev          # Development server (port 3000)
npm run build        # Production build
npm start            # Production server
npm run lint         # ESLint

# Backend
cd backend
python main.py       # Development server (port 8000)
# (no build step for Python)

# Database
# MongoDB Atlas managed via web console
# Indexes created automatically on first use
```

---

## 🔒 Security Notes

**Current (Demo Mode)**:
- JWT tokens stored in localStorage (standard practice)
- Passwords hashed with bcrypt (10 rounds)
- Google OAuth follows standard flow
- CORS configured for localhost
- WebSocket accepts user_id directly (local demo only)

**For Future Production**:
- Add HTTPS enforcement
- Implement token rotation
- Add rate limiting middleware
- Move JWT to HttpOnly cookies
- Implement WebSocket JWT verification

---

## 📝 License

Proprietary - AI ATL 2025 Hackathon Project

---

## 👥 Credits

Built for the AI ATL 2025 Hackathon.

**Tech Credits**:
- AI: Google Gemini API
- UI: React, Next.js, Tailwind CSS, Framer Motion
- Calendar: React Big Calendar, Google Calendar API
- Database: MongoDB Atlas
