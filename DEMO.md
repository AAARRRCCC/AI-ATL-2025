# Demo Guide - Study Autopilot

> Step-by-step presentation script for AI ATL 2025 Hackathon

**Demo Duration**: 8-10 minutes
**Target Audience**: Hackathon judges & attendees
**Goal**: Show AI-powered study planning in action

---

## Pre-Demo Checklist

### Day Before Demo

- [ ] Run `npm run seed-demo` to populate database
- [ ] Test all features end-to-end
- [ ] Clear browser localStorage for fresh demo
- [ ] Prepare backup account credentials
- [ ] Test internet connection for OAuth
- [ ] Have backup slides ready (if live demo fails)
- [ ] Charge laptop fully
- [ ] Test on projector/screen

### 30 Minutes Before

- [ ] Start frontend: `npm run dev`
- [ ] Start backend: `cd backend && python main.py`
- [ ] Verify both servers running
- [ ] Open browser to landing page
- [ ] Close unnecessary tabs/apps
- [ ] Turn off notifications
- [ ] Set browser zoom to 125% (visible to audience)
- [ ] Have MongoDB Atlas open in another tab (for backup)

---

## Demo Script

### Slide 0: Introduction (30 seconds)

**What to Say**:
> "Hi everyone! I'm [Name] and I built **Study Autopilot** - an AI-powered study planner that helps students break down overwhelming assignments into manageable, scheduled work sessions.
>
> The problem: Students procrastinate because they don't know where to start. Large assignments feel intimidating.
>
> The solution: AI breaks down assignments into phases, estimates time, and automatically schedules sessions based on your calendar availability.
>
> Let's see it in action!"

**Screen**: Landing page (`http://localhost:3000`)

---

### Part 1: Landing Page (30 seconds)

**What to Show**:
- Professional animated background
- Clear value proposition
- Feature cards
- Professional design

**What to Say**:
> "Here's the landing page. Notice the clean, professional design. Study Autopilot combines three powerful technologies:
> - **Next.js 15** for the frontend
> - **Google Gemini AI** for intelligent task breakdown
> - **Google Calendar API** for automatic scheduling"

**Action**: Scroll slowly through landing page

**Talking Points**:
- "Not just another todo list"
- "AI that understands assignments"
- "Automatic calendar integration"

---

### Part 2: Quick Sign Up (30 seconds)

**What to Do**:
1. Click "Get Started" button
2. Click "Sign Up" tab
3. Fill in credentials (have pre-typed):
   - Email: `demo@studyautopilot.com`
   - Password: `Demo123!`
   - Name: `Demo User`
4. Click "Sign Up"

**What to Say**:
> "Let's create an account. Simple email and password - we use bcrypt for secure password hashing and JWT for authentication."

**Expected**: Redirect to dashboard

---

### Part 3: Connect Google Calendar (45 seconds)

**What to Do**:
1. Point out "Connect Google Calendar" button
2. Click it
3. Go through OAuth flow (have Google account ready)
4. Grant calendar permissions
5. Return to dashboard

**What to Say**:
> "The magic happens when we connect Google Calendar. Study Autopilot will:
> 1. Read your existing schedule
> 2. Find free time blocks
> 3. Automatically schedule study sessions
>
> This uses OAuth 2.0 for secure access - we never see your Google password."

**Talking Points**:
- "Real calendar integration, not fake"
- "Respects existing events"
- "Finds actual free time"

---

### Part 4: Dashboard Overview (30 seconds)

**What to Show**:
- User info card
- Assignment counter
- Study sessions counter
- Calendar preview
- Chat interface

**What to Say**:
> "Here's your personalized dashboard. You can see:
> - Account information
> - Number of active assignments
> - Upcoming study sessions
> - Your calendar with scheduled sessions
> - And here's our AI chat interface"

**Action**: Point out each section

---

### Part 5: Chat with AI - The Main Feature! (2-3 minutes)

**This is the core demo - take your time!**

#### Scenario 1: Create Assignment

**What to Type**:
```
I have a research paper on climate change due next Friday. It needs to be 10 pages and I need to find at least 8 scholarly sources.
```

**What to Say BEFORE typing**:
> "Now let's see the AI in action. I'll tell it about an assignment using natural language - no forms, no rigid structure."

**What to Say WHILE AI responds**:
> "Watch what happens... The AI is:
> 1. Understanding the assignment requirements
> 2. Breaking it into logical phases
> 3. Estimating time for each phase
> 4. Finding free slots in my calendar
> 5. Creating actual calendar events"

**Expected AI Response** (paraphrase):
- "I'll help you with your climate change research paper!"
- "I've broken it into 3 phases:"
  - **Research Phase** (4 hours): Finding sources, taking notes
  - **Drafting Phase** (5 hours): Writing the paper
  - **Revision Phase** (2 hours): Editing and proofreading
- "I've scheduled these sessions in your calendar..."

**What to Show After**:
1. Scroll to calendar - **POINT OUT colored events**:
   - Blue = Research
   - Purple = Drafting
   - Green = Revision
2. Click on an event - show details
3. Drag an event to reschedule - show it updates!

**Talking Points**:
- "Natural language - no forms!"
- "AI understands assignment types"
- "Automatically creates calendar events"
- "I can drag to reschedule"
- "It respects my existing schedule"

---

#### Scenario 2: Show Intelligence (Optional if time)

**What to Type**:
```
Actually, I have a study group meeting Wednesday at 3pm. Can you reschedule any sessions that conflict?
```

**What to Say**:
> "The AI can adapt. Let me ask it to work around a new commitment."

**Expected**: AI reschedules conflicting sessions

---

### Part 6: Calendar Features (1 minute)

**What to Demonstrate**:

1. **Drag and Drop**:
   - Drag a study session to a new time
   - Show it updates in real-time
   - "Drag to reschedule - it's that easy!"

2. **Color Coding**:
   - Point out phase colors
   - "Blue for research, purple for drafting, green for revision"
   - "Makes it easy to see your study plan at a glance"

3. **Week View**:
   - Show multiple assignments across the week
   - "See your entire study schedule"

---

### Part 7: Preferences (30 seconds)

**What to Do**:
1. Click "Settings" or navigate to Preferences
2. Show preference options:
   - Study times (morning/midday/evening)
   - Available days
   - Deadline buffer

**What to Say**:
> "You can customize when you prefer to study. The AI respects these preferences when scheduling.
> - I prefer morning and evening study
> - I'm not available on Sundays
> - I want to finish 2 days before deadlines"

**Action**: Change a preference, show it saves

---

### Part 8: Theme Toggle (15 seconds)

**What to Do**:
- Toggle dark/light mode
- Show smooth transition

**What to Say**:
> "And of course, dark mode for late-night study sessions!"

**Why Show This**: Demonstrates attention to UX detail

---

### Part 9: Wrap-Up & Technical Highlights (1 minute)

**What to Say**:
> "Let me recap what you just saw:
>
> **For Students**:
> - Natural language input - just talk to it
> - Intelligent task breakdown
> - Automatic scheduling based on real availability
> - Visual progress tracking
> - Reduces procrastination by making large tasks manageable
>
> **Technical Highlights**:
> - **Frontend**: Next.js 15 with React 19, TypeScript
> - **Backend**: FastAPI with Python, WebSocket for real-time chat
> - **AI**: Google Gemini with function calling - 7 custom functions
> - **Database**: MongoDB Atlas for assignments and tasks
> - **API**: Full Google Calendar integration (read/write)
> - **UX**: Framer Motion animations, drag-and-drop, dark mode
>
> **Built in 24 hours** for this hackathon!
>
> **Future Plans**:
> - Mobile app
> - Machine learning from user patterns
> - PDF upload to extract assignment details
> - Team collaboration features
>
> Questions?"

---

## Talking Points Library

### Value Proposition
- "Procrastination comes from not knowing where to start"
- "AI removes the paralysis of a blank page"
- "Turns 'write a 10-page paper' into '30 minutes of research'"
- "Makes overwhelming assignments feel doable"

### Technical Sophistication
- "Not just a chatbot - true function calling"
- "AI can actually create calendar events"
- "Real-time WebSocket communication"
- "Modern React with Server Components"
- "Type-safe with TypeScript throughout"

### UX Excellence
- "No rigid forms - conversational interface"
- "Drag and drop - intuitive rescheduling"
- "Dark mode - attention to detail"
- "Smooth animations - professional polish"

### Differentiation
- "Not Todoist - we break down assignments"
- "Not Notion - we have AI and calendar integration"
- "Not Google Tasks - we understand assignments, not just lists"
- "Unique: AI + Calendar + Assignment Intelligence"

---

## Demo Scenarios

### Scenario A: CS Student (Primary)
**Assignment**: "Machine learning final project due in 2 weeks"
**Shows**: Technical understanding, multi-phase breakdown, long timeline

### Scenario B: English Student
**Assignment**: "Compare and contrast essay on Shakespeare's tragedies, 5 pages"
**Shows**: Different assignment type, shorter timeline

### Scenario C: Last-Minute Student
**Assignment**: "Chemistry problem set due tomorrow, 20 problems"
**Shows**: Urgency handling, realistic scheduling

Choose based on audience!

---

## Failure Recovery

### If Demo Breaks

**Option 1: Have Screenshots**
- Show screenshots of working app
- Walk through features using images
- "Here's what it looks like when working..."

**Option 2: Use Seeded Data**
- Skip to pre-populated account
- Show existing assignments and schedule

**Option 3: Explain Architecture**
- Fall back to architecture slides
- "Let me show you how it works under the hood"
- Show code snippets

**Stay Calm**: "Live demos! Let me show you using..."

---

## Backup Plans

### Internet Issues
- **Problem**: OAuth fails
- **Solution**: Use pre-authenticated account with refresh token

### Server Crashes
- **Problem**: Backend stops
- **Solution**: Have backend restart script ready: `npm run restart-backend`

### Browser Freezes
- **Problem**: Frontend unresponsive
- **Solution**: Have second browser window open

### Laptop Dies
- **Problem**: Power failure
- **Solution**: Have project running on second device

---

## Post-Demo Q&A

### Likely Questions

**Q: "How does the AI break down assignments?"**
A: "It uses Google Gemini with function calling. I defined 7 custom functions like 'create_assignment' and 'schedule_tasks'. The AI decides when to call them based on the conversation."

**Q: "Can it handle multiple assignments?"**
A: "Yes! It considers all existing assignments when scheduling new ones. It finds conflicts and optimizes the schedule."

**Q: "What if I miss a session?"**
A: "That's a future feature - auto-rescheduling. Currently you can manually drag events, but we're building AI-powered rescheduling."

**Q: "Is this just for students?"**
A: "Primarily, but the same concept works for anyone with project deadlines - freelancers, professionals, etc."

**Q: "How did you build this in 24 hours?"**
A: "Focused on core value prop first. Used modern frameworks that handle boilerplate. Prioritized features over polish initially."

**Q: "Can I use it?"**
A: "Not yet public - built for the hackathon. But if there's interest, I'd love to deploy it!"

**Q: "Security concerns?"**
A: "Great question! Currently simplified for demo (local only). Before production, I'd add: rate limiting, input sanitization, WebSocket auth, HTTPS enforcement. About 6-8 hours of hardening."

**Q: "What was the hardest part?"**
A: "Google Calendar integration - lots of OAuth edge cases. And getting the AI function calling to work reliably."

---

## Judging Criteria Alignment

### Innovation (25%)
- **Angle**: AI function calling for real-world actions
- **Pitch**: "Not just chatbots - AI that does things"

### Technical Complexity (25%)
- **Angle**: Full-stack, multiple APIs, real-time WebSocket
- **Pitch**: "Next.js 15, FastAPI, Gemini AI, MongoDB, Google Calendar"

### Practicality (25%)
- **Angle**: Solves real student problem
- **Pitch**: "40% of students report procrastination, this fixes it"

### Presentation (25%)
- **Angle**: Live demo, professional design, clear story
- **Pitch**: Follow this script!

---

## Time Variants

### 5-Minute Version
1. Landing page (30s)
2. Sign up (30s)
3. Chat demo (2min)
4. Calendar demo (1min)
5. Wrap-up (1min)

### 10-Minute Version
Use full script above

### 15-Minute Version
- Add: Detailed calendar features
- Add: Show preferences in depth
- Add: Multiple assignment scenarios
- Add: Show code architecture

---

## Visual Aids

### Point Out:
- **Color coding** on calendar
- **Animated gradients** on landing
- **Smooth transitions** between pages
- **Dark mode** toggle
- **Drag handles** on calendar events
- **Progress bars** (if implemented)

### Avoid:
- Terminal/console (unless showing tech)
- MongoDB Atlas (unless showing architecture)
- Code editor (unless Q&A demands it)

---

## Energy & Pacing

### Maintain Energy
- Smile!
- Make eye contact
- Vary tone
- Show enthusiasm
- "Look at this!" not "So, um..."

### Pacing
- **Fast**: Landing page, signup
- **SLOW**: AI chat (let them see it work)
- **Medium**: Calendar features
- **Fast**: Wrap-up

### Emphasis
- Pause after AI responses
- "Watch this..." before cool features
- Repeat key phrases:
  - "Natural language"
  - "Automatically scheduled"
  - "Real calendar integration"

---

## Final Tips

1. **Practice 5+ times** before demo day
2. **Know your backup plan** cold
3. **Test on actual projector** if possible
4. **Arrive early** to set up
5. **Breathe** - you built this!
6. **Have fun** - show your passion!

---

## Demo Checklist (Print This)

**Setup**:
- [ ] Frontend running (localhost:3000)
- [ ] Backend running (localhost:8000)
- [ ] Browser open to landing page
- [ ] Zoom at 125%
- [ ] Notifications off
- [ ] Demo account ready
- [ ] Google account ready
- [ ] Backup account ready

**During Demo**:
- [ ] Smile and make eye contact
- [ ] Speak clearly and enthusiastically
- [ ] Pause after AI responses
- [ ] Point at screen for emphasis
- [ ] Watch the time
- [ ] Breathe!

**After Demo**:
- [ ] Thank judges
- [ ] Answer questions confidently
- [ ] Offer business card/contact
- [ ] Ask for feedback

---

**Good luck! You've got this! 🏆**

**Remember**: You built something impressive in 24 hours. Show it with confidence!
