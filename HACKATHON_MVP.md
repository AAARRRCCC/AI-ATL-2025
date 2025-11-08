# Study Autopilot - Hackathon MVP (24-36 Hours)

## Goal
Build a visually stunning, demo-ready prototype that showcases the core value proposition: AI-powered assignment breakdown with smart scheduling.

## Demo Flow (2-3 minutes)
1. **Landing Page** (30 sec) - Stunning hero section with animated background, clear value prop
2. **Add Assignment** (30 sec) - User adds "10-page research paper due in 7 days"
3. **AI Magic** (45 sec) - AI breaks it down, shows estimated hours, proposes schedule
4. **Calendar View** (45 sec) - Beautiful calendar visualization with scheduled study blocks
5. **Progress Tracking** (30 sec) - Mark task complete, watch progress bar animate

---

## What We're Building (Priority Order)

### MUST HAVE (Core Demo)

#### 1. Landing Page (High Impact)
**Time: 4-6 hours**

Components needed:
- Hero section with animated gradient background (Aceternity UI)
- Animated feature cards showing key benefits
- Clear call-to-action button
- Responsive design

Tech:
- Next.js page route: `app/page.tsx`
- Aceternity UI `BackgroundGradientAnimation` or similar
- Framer Motion for scroll animations
- Tailwind for layout

**Success Criteria:**
- Judges say "wow" in first 5 seconds
- Clearly explains what the app does
- Smooth animations, no jank

#### 2. Assignment Input Form
**Time: 3-4 hours**

Features:
- Clean form with title, description, due date
- Optional difficulty/familiarity selector
- Subject/category dropdown
- "Generate Plan" button with loading state

Tech:
- Shadcn/ui Form components
- React Hook Form for validation
- Date picker (Shadcn DatePicker)
- POST to `/api/assignments/analyze`

**Success Criteria:**
- Feels polished, not a basic form
- Validation works smoothly
- Loading state is clear and animated

#### 3. AI Assignment Breakdown
**Time: 5-7 hours**

Features:
- Claude API integration for task analysis
- Parse assignment → generate phases & subtasks
- Estimate hours per task
- Store in SQLite database

Backend endpoint: `POST /api/assignments/analyze`

Request:
```json
{
  "title": "Climate Policy Research Paper",
  "description": "10-page paper analyzing climate policy frameworks",
  "due_date": "2024-11-15",
  "difficulty": "medium"
}
```

Response:
```json
{
  "assignment_id": "abc123",
  "phases": [
    {
      "name": "Research",
      "tasks": [
        {"id": "1", "title": "Find 5 credible sources", "hours": 2},
        {"id": "2", "title": "Read and take notes", "hours": 2}
      ]
    },
    {
      "name": "Drafting",
      "tasks": [
        {"id": "3", "title": "Create outline", "hours": 1},
        {"id": "4", "title": "Write introduction + body", "hours": 4}
      ]
    }
  ],
  "total_hours": 12
}
```

**Success Criteria:**
- API responds in <3 seconds
- Breakdown looks intelligent and specific
- Edge cases handled (vague assignments, tight deadlines)

#### 4. Schedule Visualization
**Time: 5-6 hours**

Features:
- Calendar-style view showing proposed study blocks
- Each block shows: date, time, task name, duration
- Color-coded by phase
- Smooth reveal animation

Tech:
- Custom calendar component or `react-big-calendar`
- Framer Motion for staggered entrance
- Hover states showing task details
- "Looks Good" / "Adjust" buttons

**Success Criteria:**
- Visually appealing, not a boring table
- Easy to understand at a glance
- Animations enhance, not distract

#### 5. Progress Dashboard
**Time: 4-5 hours**

Features:
- Active assignments list
- Progress bar with smooth fill animation
- "X / Y hours completed"
- Mark tasks complete with checkmark animation
- Next task preview

Tech:
- Shadcn Progress component
- Framer Motion for progress bar fill
- Confetti effect on completion (optional but impressive)

**Success Criteria:**
- Feels rewarding to mark tasks complete
- Progress is visually clear
- No performance lag with animations

---

### NICE TO HAVE (If Time Permits)

#### 6. Mock Google Calendar Integration
**Time: 3-4 hours**

Instead of real OAuth:
- Pre-populate with fake calendar events
- Show "free" vs "busy" blocks
- Demonstrate how scheduling avoids conflicts

#### 7. Settings/Preferences
**Time: 2-3 hours**

Simple modal with:
- Preferred work session length
- Best productivity hours
- Buffer time multiplier

#### 8. Responsive Mobile View
**Time: 3-4 hours**

Make landing page + dashboard work well on mobile.

---

### SKIP FOR DEMO

- Real Google OAuth (use mock data)
- Auto-rescheduling logic (mention it, don't build it)
- PDF upload (manual entry only)
- User accounts / authentication
- Weekly reset prompts
- Notifications
- Actual deployment to production

---

## Hour-by-Hour Timeline

### Day 1 (12-14 hours)

**Hour 1-2:** Project setup
- Initialize Next.js with Tailwind
- Set up FastAPI backend
- Configure SQLite
- Docker Compose file
- Install Shadcn/ui

**Hour 3-6:** Landing page
- Build hero section with Aceternity UI
- Feature cards
- Responsive layout
- Polish animations

**Hour 7-10:** Backend + AI
- Claude API integration
- Assignment analysis prompt engineering
- Database models
- API endpoint

**Hour 11-14:** Assignment form
- Build form UI
- Connect to backend
- Loading states
- Validation

### Day 2 (12-14 hours)

**Hour 1-4:** Calendar scheduling
- Scheduling algorithm (simplified)
- Calendar visualization component
- Animations

**Hour 5-8:** Progress dashboard
- Dashboard layout
- Task list
- Progress bars
- Complete task flow

**Hour 9-12:** Polish & testing
- Fix bugs
- Refine animations
- Test demo flow end-to-end
- Prepare talking points

**Hour 13-14:** Buffer
- Handle anything that ran over
- Add finishing touches
- Final rehearsal

---

## Technical Setup Commands

### Initial Setup
```bash
# Frontend
npx create-next-app@latest study-autopilot --typescript --tailwind --app
cd study-autopilot
npx shadcn-ui@latest init

# Install dependencies
npm install framer-motion zustand @tanstack/react-query lucide-react date-fns

# Backend
mkdir backend
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install fastapi uvicorn sqlalchemy anthropic python-dotenv
```

### Run Development
```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend
cd backend
uvicorn main:app --reload

# Or use Docker Compose (once set up)
docker-compose up
```

---

## Claude API Prompt Template

```python
ASSIGNMENT_ANALYSIS_PROMPT = """
You are helping a student plan their assignment. Break it down into manageable tasks.

Assignment Details:
- Title: {title}
- Description: {description}
- Due Date: {due_date}
- Difficulty: {difficulty}

Provide a structured breakdown with:
1. Major phases (e.g., Research, Drafting, Revision)
2. Specific tasks within each phase
3. Realistic time estimates in hours

Be encouraging but realistic. Consider the student's difficulty rating.

Return JSON in this format:
{{
  "phases": [
    {{
      "name": "Phase name",
      "tasks": [
        {{"title": "Specific task", "hours": 2, "description": "What to accomplish"}}
      ]
    }}
  ],
  "total_hours": 12,
  "encouragement": "You've got this! Start with research to build momentum."
}}
"""
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

1. **Problem:** "Students procrastinate because big assignments feel overwhelming"
2. **Solution:** "Study Autopilot uses AI to break down assignments and auto-schedule realistic study sessions"
3. **Demo:** Walk through adding an assignment
4. **Magic moment:** Show AI breakdown appearing
5. **Value:** "No more all-nighters. You know exactly what to do and when."
6. **Vision:** Mention future features (Google Calendar sync, smart rescheduling)

---

## Pre-Demo Checklist

- [ ] Localhost backend running
- [ ] Frontend running without errors
- [ ] Sample assignment ready to paste in
- [ ] Database seeded with one completed assignment (to show progress)
- [ ] Browser cache cleared (fresh experience)
- [ ] Backup plan if live AI call fails (pre-cached response)
- [ ] Screen recording as backup
