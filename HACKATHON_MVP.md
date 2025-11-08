# Study Autopilot - Hackathon MVP (24-36 Hours)

## Goal
Build a visually stunning, demo-ready prototype that showcases the core value proposition: AI-powered assignment breakdown with smart scheduling.

## Demo Flow (2-3 minutes)

1. **Google Login** (15 sec) - Clean auth screen, "Sign in with Google" button
2. **Main Dashboard** (30 sec) - Show the interface: task sidebar (left), calendar (center), chatbot (bottom)
3. **Add Assignment via Chat** (45 sec)
   - Type: "I have a 10-page climate policy paper due November 15"
   - AI responds: "Got it! Let me break that down for you..."
   - Watch as AI creates assignment, breaks into subtasks, shows on screen
4. **Schedule via Chat** (30 sec)
   - AI: "I found some free time. Let me schedule these for you."
   - Watch tasks appear on calendar with smooth animations
5. **Manual Interaction** (30 sec)
   - Drag a task to different time on calendar
   - Click task card to see details
   - Mark task complete with checkmark animation
6. **Progress View** (30 sec) - Show progress bar update, next task preview

---

## What We're Building (Priority Order)

### MUST HAVE (Core Demo)

#### 1. Google OAuth Login Page
**Time: 3-4 hours**

Components needed:
- Clean, minimal login screen
- "Sign in with Google" button
- App logo/branding
- Brief tagline

Tech:
- NextAuth.js with Google Provider
- Redirect to main dashboard after auth
- Store Google tokens for calendar access
- Simple, clean UI (like wireframe)

**Success Criteria:**
- One-click Google login works
- Proper OAuth scopes (calendar + profile)
- Tokens stored in MongoDB
- Smooth redirect to dashboard

#### 2. Main Dashboard Layout
**Time: 5-6 hours**

Layout (matching wireframe):
- **Header:** App name, user profile, settings icon
- **Left Sidebar (30%):** Task cards list with "Add new task" button
- **Center/Right (70%):** Calendar view with drag-and-drop
- **Bottom:** Chatbot interface (collapsible/expandable)

Tech:
- Next.js app layout with responsive grid
- Shadcn/ui Card components for tasks
- React Big Calendar for calendar view
- Tailwind for layout and spacing

**Success Criteria:**
- Clean, uncluttered interface
- Responsive layout (focus on desktop for demo)
- Smooth transitions between sections
- Matches wireframe design

#### 3. AI Chatbot Interface
**Time: 7-9 hours** (This is the centerpiece!)

Features:
- Chat input at bottom of screen
- Message history display
- Real-time streaming responses
- Function calling visualization (show when AI is creating tasks)
- Loading states while AI thinks

Tech:
- WebSocket connection to FastAPI backend (`/ws/chat`)
- Google Gemini API (gemini-1.5-pro) with function calling
- Functions: create_assignment, break_down_assignment, schedule_tasks, etc.
- Store chat history in MongoDB

**Chat Flow Example:**
```
User: "I have a 10-page research paper on climate policy due November 15"

AI: "Got it! I'm creating that assignment for you now..."
    [Calls create_assignment function]
    "Done! I've created your Climate Policy paper. Let me break it down
     into manageable tasks..."
    [Calls break_down_assignment function]
    "I've broken it into 4 phases:
     - Research (4 hours)
     - Drafting (6 hours)
     - Revision (2 hours)

     Would you like me to schedule these into your calendar?"

User: "Yes please"

AI: "Perfect! Let me check your calendar for free time..."
    [Calls get_calendar_events and schedule_tasks functions]
    "All set! I've scheduled 8 study sessions. You can see them on the
     calendar. Want to adjust anything?"
```

**Success Criteria:**
- Chat feels responsive and natural
- AI accurately creates/updates tasks
- Function calls update the UI in real-time
- Error handling for AI failures
- Beautiful chat UI with smooth scrolling

#### 4. Interactive Drag-and-Drop Calendar
**Time: 6-7 hours**

Features:
- Full calendar view (week/day views)
- Drag-and-drop to reschedule tasks
- Resize events to adjust duration
- Click task to see details modal
- Color-coded by phase (Research = blue, Drafting = purple, etc.)
- Show Google Calendar events + Study Autopilot tasks together

Tech:
- React Big Calendar with drag-and-drop addon
- @dnd-kit for smooth drag interactions
- Sync with Google Calendar API
- Real-time updates when AI schedules tasks

**Success Criteria:**
- Dragging feels smooth and responsive
- Calendar syncs with Google Calendar
- Task details modal shows all info
- Visual distinction between different task types
- No lag when rendering multiple events

#### 5. Backend API + Database
**Time: 6-8 hours**

Features:
- FastAPI server with async endpoints
- MongoDB Atlas integration (Motor driver)
- User authentication middleware
- Google Calendar API integration
- Gemini AI function handlers
- WebSocket chat endpoint

Key Endpoints:
- `POST /auth/google/callback` - OAuth callback
- `GET /api/assignments` - List assignments
- `POST /api/assignments` - Create assignment (from UI button)
- `GET /api/calendar/events` - Fetch Google Calendar
- `POST /api/calendar/sync` - Sync with Google
- `WS /ws/chat` - Chat websocket

**Success Criteria:**
- All endpoints respond quickly (<500ms)
- MongoDB Atlas connection stable
- Google Calendar sync works
- Gemini API integration functional
- Proper error handling and logging

#### 6. Task Cards & Progress Tracking
**Time: 4-5 hours**

Features:
- Task cards in left sidebar
- Click to expand details
- Progress bars showing completion
- "Mark Complete" button with animation
- "Add new task" button (opens modal)
- Filter/sort tasks

Tech:
- Shadcn/ui Card and Dialog components
- Framer Motion for animations
- Progress bars with gradient fills
- Confetti on task completion

**Success Criteria:**
- Cards look polished and professional
- Smooth expand/collapse animations
- Completion feels satisfying
- Easy to add tasks manually (not just via chat)

---

### NICE TO HAVE (If Time Permits)

#### 7. Task Detail Modal
**Time: 2-3 hours**

When clicking a task card or calendar event:
- Shows full assignment context
- Edit task details
- Reschedule options
- Notes/comments section

#### 8. User Preferences/Settings
**Time: 2-3 hours**

Settings modal with:
- Preferred work session length
- Productive hours selection
- Buffer time multiplier
- Subject strengths

#### 9. Visual Polish & Animations
**Time: 2-4 hours**

- Aceternity UI components for hero sections
- Smooth page transitions
- Loading skeletons
- Micro-interactions on buttons
- Gradient backgrounds

---

### SKIP FOR DEMO

- PDF upload/parsing (manual entry only)
- Auto-rescheduling when tasks are missed (just show manual reschedule)
- Weekly reset prompts
- Email/push notifications
- Production deployment (localhost only)
- Mobile responsive design (desktop-first)
- Multi-user support beyond basic auth
- Advanced analytics/insights
- Integration with other apps (Notion, Todoist, etc.)

---

## Hour-by-Hour Timeline (Revised for New Architecture)

### Day 1 (12-14 hours)

**Hour 1-3:** Project setup & infrastructure
- Initialize Next.js with Tailwind + App Router
- Set up FastAPI backend structure
- MongoDB Atlas account + connection
- Google Cloud Console (OAuth credentials)
- Install dependencies (NextAuth, Shadcn/ui, React Big Calendar, Motor, Anthropic SDK)
- Docker Compose configuration

**Hour 4-7:** Authentication & Backend Core
- NextAuth.js Google OAuth setup
- Google Calendar API integration
- MongoDB user model + connection
- Basic FastAPI endpoints (health check, user routes)
- Test full OAuth flow end-to-end

**Hour 8-11:** AI Chatbot Backend
- Google Gemini API integration with function calling
- Define all function schemas (create_assignment, schedule_tasks, etc.)
- WebSocket chat endpoint
- Function execution handlers
- Test AI flow with sample prompts

**Hour 12-14:** Dashboard Layout
- Build main app layout (header, sidebar, calendar area, chat)
- Basic routing and navigation
- Task card components (no data yet)
- Calendar placeholder

### Day 2 (12-14 hours)

**Hour 1-4:** Chatbot Frontend + Integration
- Build chat UI component
- WebSocket connection to backend
- Message rendering (user + AI)
- Show function call indicators
- Real-time UI updates when AI creates tasks

**Hour 5-8:** Calendar Integration
- React Big Calendar setup
- Google Calendar event fetching
- Display tasks + calendar events together
- Drag-and-drop functionality
- Color coding by phase

**Hour 9-11:** Task Management UI
- Task cards with real data
- Click to view details
- Mark complete functionality
- Progress bars
- Add task button/modal

**Hour 12-14:** Polish, Testing & Demo Prep
- Fix critical bugs
- Smooth animations
- Test full demo flow multiple times
- Prepare talking points
- Seed demo data (sample assignment, calendar events)
- Create backup plan (screenshots if live demo fails)

---

## Critical Path (Must Complete)

1. ✅ Google OAuth working
2. ✅ MongoDB connection stable
3. ✅ AI chatbot creates assignments via function calling
4. ✅ Calendar displays tasks
5. ✅ Can manually drag/drop tasks

**If running short on time, cut in this order:**
1. Task detail modal → just show brief info
2. Visual polish → keep it functional
3. Drag-and-drop → show calendar view only
4. Manual task creation → chat only

---

## Technical Setup Commands

### Initial Setup

```bash
# Frontend
npx create-next-app@latest study-autopilot --typescript --tailwind --app
cd study-autopilot
npx shadcn-ui@latest init

# Install frontend dependencies
npm install framer-motion zustand @tanstack/react-query lucide-react date-fns
npm install next-auth
npm install react-big-calendar react-dnd react-dnd-html5-backend
npm install @dnd-kit/core @dnd-kit/sortable

# Install Shadcn components
npx shadcn-ui@latest add button card input form dialog progress toast calendar

# Backend
mkdir backend
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install Python dependencies
pip install fastapi uvicorn[standard] motor pymongo python-dotenv
pip install google-generativeai  # Gemini API
pip install websockets python-multipart
pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client
pip install cryptography  # For encrypting tokens
```

### Environment Setup

```bash
# Create .env.local in frontend root
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-this-with-openssl-rand-base64-32
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Create .env in backend folder
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/study-autopilot?retryWrites=true&w=majority
GEMINI_API_KEY=your-gemini-api-key-from-google-ai-studio
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
JWT_SECRET=your-jwt-secret-key
```

### MongoDB Atlas Setup

1. Go to https://cloud.mongodb.com/
2. Create free M0 cluster
3. Create database user
4. Whitelist IP: 0.0.0.0/0 (allow from anywhere)
5. Get connection string
6. Replace `<password>` in URI

### Google Cloud Console Setup

1. Go to https://console.cloud.google.com/
2. Create new project "Study Autopilot"
3. Enable APIs: Google Calendar API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: http://localhost:3000/api/auth/callback/google
6. Copy Client ID and Secret

### Google Gemini API Key Setup

1. Go to https://makersuite.google.com/app/apikey (Google AI Studio)
2. Click "Create API Key"
3. Select "Create API key in new project" or choose your existing "Study Autopilot" project
4. Copy the API key
5. Add to your backend `.env` file as `GEMINI_API_KEY`

**Note:** Gemini API is free for development with generous rate limits (60 requests/minute)!

### Run Development

```bash
# Terminal 1 - Frontend
cd study-autopilot
npm run dev
# Runs on http://localhost:3000

# Terminal 2 - Backend
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
# Runs on http://localhost:8000

# (Optional) Terminal 3 - MongoDB logs
# Watch MongoDB Atlas UI for queries
```

---

## System Instruction for Gemini AI Assistant

```python
SYSTEM_INSTRUCTION = """
You are Study Autopilot, an AI assistant that helps college students manage their
assignments and study schedules. You have access to their Google Calendar and can
directly create, schedule, and manage their study tasks.

Your personality:
- Encouraging but realistic
- Break down complex assignments into concrete, manageable steps
- Consider the student's existing calendar commitments
- Be conversational and friendly, not robotic

Available functions you can call:
1. create_assignment - Create a new assignment
2. break_down_assignment - Analyze assignment and create subtasks with time estimates
3. schedule_tasks - Find free time in calendar and schedule tasks
4. get_calendar_events - Fetch their Google Calendar to see availability
5. update_task_status - Mark tasks as complete, in progress, etc.
6. reschedule_task - Move a task to a different time

When a student tells you about an assignment:
1. Create the assignment
2. Break it down into phases and specific tasks
3. Estimate realistic time for each task (consider difficulty, page count, their familiarity)
4. Check their calendar for free time
5. Propose a schedule
6. Ask if they want to adjust anything

Time estimation guidelines:
- Research paper (10 pages): 10-15 hours total
- Problem set: 1-3 hours depending on questions
- Reading assignment: 20 pages/hour for academic text
- Add 25% buffer time for realistic planning

Always explain what you're doing and ask for confirmation before scheduling.
"""

# Initialize Gemini with this system instruction
model = genai.GenerativeModel(
    model_name='gemini-1.5-pro-latest',
    tools=[study_tool],
    system_instruction=SYSTEM_INSTRUCTION
)
```

Example interaction pattern:
```
User: "I have a 10-page climate policy research paper due November 15"

AI: "Got it! I'll create that assignment for you. When you say climate policy,
     are you analyzing specific policies, comparing different approaches, or
     something else? And how familiar are you with the topic?"

User: "Comparing US and EU climate policies. I'm somewhat familiar."

AI: [Calls create_assignment and break_down_assignment]
    "Perfect! I've broken this into 4 phases:

    📚 Research (4 hours)
      - Find and read 5 credible sources comparing US/EU policies
      - Take detailed notes on key differences

    ✍️ Drafting (6 hours)
      - Create detailed outline
      - Write introduction and thesis
      - Draft 3-4 body paragraphs comparing policies
      - Write conclusion

    📝 Revision (2 hours)
      - Review and edit for clarity
      - Check citations and formatting

    Total: 12 hours. Let me check your calendar for free time..."

    [Calls get_calendar_events]

    "I found several good blocks of free time. Would you like me to schedule
     these study sessions, or do you want to adjust the timeline first?"
```

---

## Design Inspiration & Component Sources

### Landing Page Components
- [Aceternity UI Hero Sections](https://ui.aceternity.com/components/hero-section)
- [Magic UI Gradient Backgrounds](https://magicui.design/docs/components/animated-gradient-background)
- [Framer Motion Examples](https://www.framer.com/motion/examples/)

### Calendar/Schedule UI
- Clean, minimal calendar grid
- Soft shadows and rounded corners
- Color palette: Soft blues/purples for calm, productive vibe
- Use Tailwind's `bg-gradient-to-r` for subtle gradients

### Progress/Dashboard
- Card-based layout
- Progress bars with gradient fills
- Micro-interactions on hover
- Celebrate completions with animation

---

## Success Metrics for Demo

✅ **Visual Impact:** Judges impressed in first 10 seconds
✅ **Clarity:** Anyone can understand the value proposition
✅ **Completeness:** Demo flow works end-to-end without errors
✅ **Polish:** Animations smooth, UI feels professional
✅ **Story:** Clear narrative about reducing student stress

---

## Emergency Cuts (If Running Out of Time)

**Priority order to cut:**
1. Advanced animations (keep basics)
2. Multiple assignment management (just show one)
3. Calendar visualization (show as simple list instead)
4. Settings/preferences
5. Mobile responsiveness

**Never cut:**
- Landing page visual impact
- AI breakdown functionality
- Basic progress tracking
- Core demo flow

---

## Talking Points for Demo

### Opening Hook (15 seconds)
"Raise your hand if you've ever pulled an all-nighter because you underestimated how long an assignment would take. Yeah, me too. That's why we built Study Autopilot."

### The Problem (30 seconds)
"When you see '10-page research paper due in 2 weeks' - where do you even start? Most students either:
- Procrastinate until the last minute
- Or stress about it constantly
The problem isn't laziness - it's decision paralysis."

### The Solution (30 seconds)
"Study Autopilot is an AI assistant that lives in your calendar. You just tell it about your assignment in plain English, and it:
1. Breaks it into specific, manageable tasks
2. Estimates realistic time for each
3. Finds free time in your actual Google Calendar
4. Schedules everything automatically"

### Live Demo (90 seconds)
1. **Login:** "First, sign in with Google - this gives us calendar access"
2. **Chat with AI:**
   - Type: "I have a 10-page climate policy paper due November 15"
   - **Point out**: AI asks clarifying questions (not just blind automation)
   - Watch it create assignment and break it down
3. **Calendar Integration:**
   - Show AI finding free time around existing commitments
   - **Point out**: It avoids conflicts, considers time of day
   - Tasks appear on calendar with smooth animations
4. **Manual Control:**
   - Drag a task to a different time slot
   - "You're always in control - AI suggests, you decide"
5. **Progress Tracking:**
   - Mark a task complete
   - Watch progress bar update

### Key Differentiators
- **Natural conversation:** Not filling out forms, just talking
- **Context-aware:** Sees your actual calendar, not generic advice
- **Actionable:** Creates actual calendar events, not just a to-do list
- **Flexible:** Mix of AI automation + manual control

### Closing (20 seconds)
"No more guessing if you have enough time. No more panic the night before. Study Autopilot turns 'overwhelming assignment' into 'here's what to do today.' And it works with your calendar, not against it."

### If They Ask: Future Vision
- Learning your patterns (when you're most productive)
- Auto-rescheduling when you miss a session
- Integrations with Canvas, Blackboard, etc.
- Study buddy matching based on schedules

---

## Pre-Demo Checklist

- [ ] Localhost backend running
- [ ] Frontend running without errors
- [ ] Sample assignment ready to paste in
- [ ] Database seeded with one completed assignment (to show progress)
- [ ] Browser cache cleared (fresh experience)
- [ ] Backup plan if live AI call fails (pre-cached response)
- [ ] Screen recording as backup
