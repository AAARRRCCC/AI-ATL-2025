# TODO - Study Autopilot

> Priority-ordered task list for hackathon demo

**Last Updated**: 2025-01-08
**Project Phase**: Hackathon MVP - Demo Focused
**Target**: Impressive local demo for competition
**Mode**: 🎪 **LOCAL DEMO** (security deprioritized)

---

## Priority Legend

- 🔴 **CRITICAL** - Demo blockers, must work to show the product
- 🟠 **HIGH** - Makes demo impressive, "wow factor" features
- 🟡 **MEDIUM** - Polish, nice-to-haves for presentation
- 🟢 **LOW** - Future work, production concerns, post-hackathon

**Estimated Time to Demo-Ready**: 12-16 hours of focused development

---

## Table of Contents

1. [Critical Tasks - Demo Blockers](#critical-tasks-🔴)
2. [High Priority - Impressive Features](#high-priority-tasks-🟠)
3. [Medium Priority - Polish](#medium-priority-tasks-🟡)
4. [Low Priority - Post-Demo](#low-priority-tasks-🟢)
5. [Demo Setup](#demo-setup)
6. [Quick Wins](#quick-wins)

---

## Critical Tasks 🔴

**Must work to demonstrate the product - focus here first!**

### 🔴-1: Complete Backend Function Executor

**Priority**: CRITICAL (Demo Blocker)
**Impact**: AI can't create assignments or schedule tasks - the core feature doesn't work!
**Estimated Time**: 6-8 hours

**Location**: `backend/services/function_executor.py`

**Why Critical for Demo**: Judges need to see the AI actually creating assignments and scheduling them to calendars. This is the main value proposition.

**Tasks**:

#### 1a. Implement `create_assignment` function
- [ ] Parse function arguments from Gemini
- [ ] Insert assignment into MongoDB `assignments` collection
- [ ] Return assignment ID to AI
- [ ] Handle errors gracefully

**Implementation**:
```python
async def _create_assignment(self, args: dict):
    assignment = {
        "userId": ObjectId(self.user_id),
        "title": args["assignment_title"],
        "type": args["assignment_type"],
        "dueDate": datetime.fromisoformat(args["due_date"]),
        "subject": args.get("subject", "general"),
        "estimatedHours": args.get("estimated_hours", 5),
        "status": "active",
        "createdAt": datetime.utcnow(),
        "phases": []
    }
    result = await self.db.assignments.insert_one(assignment)
    return {"assignmentId": str(result.inserted_id), "status": "created"}
```

#### 1b. Implement `break_down_assignment` function
- [ ] Parse phases and tasks from AI
- [ ] Insert tasks into MongoDB `tasks` collection
- [ ] Link tasks to assignment
- [ ] Calculate time estimates per phase
- [ ] Return task IDs

#### 1c. Implement `schedule_tasks` function
- [ ] Get free time blocks from calendar API
- [ ] Match tasks to free blocks based on preferences
- [ ] Create Google Calendar events for each task
- [ ] Store calendar event IDs with tasks
- [ ] Return scheduled task count

**Demo Impact**: ⭐⭐⭐⭐⭐ (Maximum - nothing works without this)

---

### 🔴-2: Implement Assignment CRUD API

**Priority**: CRITICAL
**Impact**: Need to query and display assignments in UI
**Estimated Time**: 3 hours

**Tasks**:

#### 2a. Create `POST /api/assignments` endpoint
- [ ] Validate input (title, type, dueDate)
- [ ] Insert into MongoDB
- [ ] Return assignment object

#### 2b. Create `GET /api/assignments` endpoint
- [ ] Query by userId
- [ ] Support status filter
- [ ] Sort by dueDate
- [ ] Return assignments array

#### 2c. Create `GET /api/assignments/[id]` endpoint
- [ ] Fetch assignment with tasks
- [ ] Include progress calculation
- [ ] Return full assignment object

**Files**: `app/api/assignments/route.ts` and `app/api/assignments/[id]/route.ts`

**Demo Impact**: ⭐⭐⭐⭐⭐ (Need data to show)

---

### 🔴-3: Implement Task CRUD API

**Priority**: CRITICAL
**Impact**: Tasks are the core unit of work
**Estimated Time**: 2 hours

**Tasks**:
- [ ] `POST /api/tasks` - Create task
- [ ] `GET /api/tasks` - List tasks (with filters)
- [ ] `GET /api/tasks/[id]` - Get task details
- [ ] `PATCH /api/tasks/[id]/status` - Update status (complete/incomplete)

**Files**: `app/api/tasks/route.ts` and `app/api/tasks/[id]/`

**Demo Impact**: ⭐⭐⭐⭐⭐ (Essential for task management)

---

### 🔴-4: Create Assignment UI Components

**Priority**: CRITICAL
**Impact**: Judges need to SEE the assignments
**Estimated Time**: 3 hours

**Tasks**:

#### 4a. Create AssignmentList component
- [ ] Fetch and display assignments
- [ ] Grid layout with cards
- [ ] Filter by status tabs
- [ ] Loading states

#### 4b. Create AssignmentCard component
- [ ] Show title, subject, due date
- [ ] Progress bar with percentage
- [ ] Phase indicators
- [ ] Click to expand

#### 4c. Create AssignmentDetail modal
- [ ] Full assignment info
- [ ] Task list by phase
- [ ] Progress visualization
- [ ] Edit/delete actions

#### 4d. Integrate into Dashboard
- [ ] Add assignments section
- [ ] Show upcoming deadlines
- [ ] Quick stats

**Files**:
- `components/AssignmentList.tsx`
- `components/AssignmentCard.tsx`
- `components/AssignmentDetail.tsx`

**Demo Impact**: ⭐⭐⭐⭐⭐ (Visual proof it works)

---

### 🔴-5: Create Task Management UI

**Priority**: CRITICAL
**Impact**: Show task breakdown and management
**Estimated Time**: 2 hours

**Tasks**:
- [ ] TaskList component with phase grouping
- [ ] Checkboxes to mark complete
- [ ] Task detail modal
- [ ] Add to dashboard sidebar

**Files**:
- `components/TaskList.tsx`
- `components/TaskDetail.tsx`
- Update `app/dashboard/page.tsx`

**Demo Impact**: ⭐⭐⭐⭐ (Shows intelligent breakdown)

---

### 🔴-6: Add Demo Data Seeding

**Priority**: CRITICAL
**Impact**: Quick setup for impressive demo
**Estimated Time**: 1 hour

**Tasks**:
- [ ] Create seed script with sample assignments
- [ ] Pre-populate calendar events
- [ ] Create realistic chat history
- [ ] One command setup

**File**: `scripts/seed-demo-data.js`

**Script**:
```javascript
// Sample structure
const sampleAssignments = [
  {
    title: "Machine Learning Final Project",
    type: "project",
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    subject: "Computer Science",
    phases: ["research", "implementation", "testing", "presentation"]
  },
  // ... more samples
];
```

**Demo Impact**: ⭐⭐⭐⭐⭐ (Instant impressive demo)

---

## High Priority Tasks 🟠

**Makes demo impressive - tackle after critical tasks**

### 🟠-1: Add Progress Visualizations

**Priority**: HIGH (Wow Factor)
**Estimated Time**: 2 hours

**Tasks**:
- [ ] Progress bar animations
- [ ] Completion percentage charts
- [ ] Phase breakdown visual
- [ ] Stats cards with numbers

**Files**:
- `components/ProgressChart.tsx`
- `components/StatsCard.tsx`

**Demo Impact**: ⭐⭐⭐⭐ (Makes it look professional)

---

### 🟠-2: Implement Chat History Persistence

**Priority**: HIGH
**Impact**: Show conversation context over time
**Estimated Time**: 2 hours

**Tasks**:
- [ ] Create chat_history collection
- [ ] Store messages on send/receive
- [ ] Load history on chat open
- [ ] Display timestamp
- [ ] Scroll to load more

**Files**:
- `backend/ai/chat_handler.py`
- `app/api/chat/history/route.ts`
- `components/chat/ChatContainer.tsx`

**Demo Impact**: ⭐⭐⭐⭐ (Shows persistence and intelligence)

---

### 🟠-3: Add Activity Feed

**Priority**: HIGH
**Impact**: Show system in action
**Estimated Time**: 2 hours

**Tasks**:
- [ ] Track user activities (assignment created, task completed)
- [ ] Create ActivityFeed component
- [ ] Display in dashboard sidebar
- [ ] Real-time updates

**Files**:
- `components/ActivityFeed.tsx`
- `app/api/activity/route.ts`

**Demo Impact**: ⭐⭐⭐ (Shows engagement)

---

### 🟠-4: Enhance Calendar Visuals

**Priority**: HIGH
**Impact**: Calendar is a key demo element
**Estimated Time**: 2 hours

**Tasks**:
- [ ] Smooth drag animations
- [ ] Color gradients for phases
- [ ] Hover effects
- [ ] Event click popover
- [ ] Today indicator
- [ ] Loading skeletons

**File**: `components/Calendar.tsx`

**Demo Impact**: ⭐⭐⭐⭐ (Visual polish)

---

### 🟠-5: Add Dashboard Stats

**Priority**: HIGH
**Impact**: Quick metrics impress judges
**Estimated Time**: 1 hour

**Tasks**:
- [ ] Total assignments count
- [ ] Completion rate percentage
- [ ] Study hours this week
- [ ] Streak counter
- [ ] Animated number counters

**File**: `app/dashboard/page.tsx`

**Demo Impact**: ⭐⭐⭐⭐ (Shows value quickly)

---

### 🟠-6: Create Assignment Form

**Priority**: HIGH
**Impact**: Allow manual assignment creation
**Estimated Time**: 2 hours

**Tasks**:
- [ ] Create AssignmentForm component
- [ ] Fields: title, type, dueDate, subject, estimated hours
- [ ] Validation
- [ ] Submit to API
- [ ] Success feedback

**File**: `components/AssignmentForm.tsx`

**Demo Impact**: ⭐⭐⭐ (Alternative to AI creation)

---

## Medium Priority Tasks 🟡

**Polish and nice-to-haves**

### 🟡-1: Add Search Functionality

**Priority**: MEDIUM
**Estimated Time**: 2 hours

**Tasks**:
- [ ] SearchBar component
- [ ] Search assignments by title
- [ ] Search tasks
- [ ] Keyboard shortcut (Cmd+K)

---

### 🟡-2: Improve Calendar Features

**Priority**: MEDIUM
**Estimated Time**: 2 hours

**Tasks**:
- [ ] Event creation from calendar (click empty slot)
- [ ] Event editing modal
- [ ] Conflict detection visual
- [ ] Multi-day event support

---

### 🟡-3: Add Notification Toasts

**Priority**: MEDIUM
**Estimated Time**: 1 hour

**Tasks**:
- [ ] Success toasts (assignment created, task completed)
- [ ] Error toasts
- [ ] Info toasts
- [ ] Better positioning and styling

---

### 🟡-4: Add User Profile Page

**Priority**: MEDIUM
**Estimated Time**: 2 hours

**Tasks**:
- [ ] Create profile page
- [ ] Display user info
- [ ] Edit name/email
- [ ] Account stats

---

### 🟡-5: Enhance Preferences Page

**Priority**: MEDIUM
**Estimated Time**: 2 hours

**Tasks**:
- [ ] Max/min session length sliders
- [ ] Break time preferences
- [ ] Better UI/UX
- [ ] Save confirmation animation

---

### 🟡-6: Add Loading States and Skeletons

**Priority**: MEDIUM
**Estimated Time**: 1 hour

**Tasks**:
- [ ] Skeleton loaders for all components
- [ ] Loading spinners
- [ ] Progress indicators
- [ ] Smooth transitions

---

### 🟡-7: Add Onboarding Flow

**Priority**: MEDIUM
**Estimated Time**: 2 hours

**Tasks**:
- [ ] Welcome modal on first login
- [ ] Step-by-step setup
- [ ] Connect calendar prompt
- [ ] Set preferences prompt
- [ ] Create first assignment prompt

---

### 🟡-8: Improve Error Handling

**Priority**: MEDIUM
**Estimated Time**: 1 hour

**Tasks**:
- [ ] Friendly error messages
- [ ] Error boundaries
- [ ] Retry mechanisms
- [ ] Fallback UI

---

### 🟡-9: Add Keyboard Shortcuts

**Priority**: MEDIUM
**Estimated Time**: 1 hour

**Tasks**:
- [ ] Cmd+K for search
- [ ] Cmd+N for new assignment
- [ ] Esc to close modals
- [ ] Shortcuts help modal

---

### 🟡-10: Add Assignment Templates

**Priority**: MEDIUM
**Estimated Time**: 2 hours

**Tasks**:
- [ ] Common assignment templates (essay, project, exam prep)
- [ ] Quick create from template
- [ ] Customizable templates

---

## Low Priority Tasks 🟢

**Post-demo, production, future work**

### 🟢-1: Security Hardening (FUTURE/PRODUCTION)

**Priority**: LOW (Not needed for local demo)
**Estimated Time**: 4 hours

**Tasks**:
- [ ] WebSocket JWT authentication
- [ ] Rate limiting
- [ ] Input sanitization
- [ ] CSRF protection
- [ ] Security headers

**Why Low**: Local demo, trusted environment, no public deployment

---

### 🟢-2: Testing Suite (FUTURE)

**Priority**: LOW
**Estimated Time**: 8+ hours

**Tasks**:
- [ ] Set up Jest + React Testing Library
- [ ] Component tests
- [ ] API tests
- [ ] Integration tests
- [ ] E2E tests with Playwright

**Why Low**: Not needed to show functionality in demo

---

### 🟢-3: Remove Debug Logging (KEEP FOR NOW!)

**Priority**: LOW (Actually helpful for demo debugging)
**Estimated Time**: 1 hour

**Note**: Debug logs in `lib/google-calendar.ts` are actually useful for troubleshooting during demo. Keep them for now.

---

### 🟢-4: Auto-Rescheduling Logic

**Priority**: LOW (Future feature)
**Estimated Time**: 4 hours

**Tasks**:
- [ ] Background job system
- [ ] Missed task detection
- [ ] Automatic rescheduling
- [ ] User notifications

---

### 🟢-5: PDF Upload and Parsing

**Priority**: LOW (Stretch goal)
**Estimated Time**: 6 hours

**Tasks**:
- [ ] PDF upload component
- [ ] PDF parsing
- [ ] Extract assignment details
- [ ] Auto-fill form

---

### 🟢-6: Email Notifications

**Priority**: LOW
**Estimated Time**: 3 hours

**Tasks**:
- [ ] Email service setup
- [ ] Deadline reminders
- [ ] Weekly summaries

---

### 🟢-7: Analytics Dashboard

**Priority**: LOW
**Estimated Time**: 4 hours

**Tasks**:
- [ ] Analytics page
- [ ] Productivity charts
- [ ] Time tracking
- [ ] Export reports

---

### 🟢-8: Mobile App

**Priority**: LOW (Way future)
**Estimated Time**: 40+ hours

**Tasks**:
- [ ] React Native setup
- [ ] Port components
- [ ] Mobile-specific features

---

### 🟢-9: Production Deployment

**Priority**: LOW (Post-hackathon)
**Estimated Time**: 4 hours

**Tasks**:
- [ ] Vercel deployment
- [ ] Railway backend deployment
- [ ] Environment configs
- [ ] Domain setup
- [ ] SSL certificates

---

### 🟢-10: CI/CD Pipeline

**Priority**: LOW
**Estimated Time**: 3 hours

**Tasks**:
- [ ] GitHub Actions
- [ ] Automated testing
- [ ] Automated deployment
- [ ] Code quality checks

---

## Demo Setup

### Quick Demo Data Setup

**One-Command Setup** (to be created):
```bash
npm run seed-demo
```

**What it does**:
1. Creates 3-4 sample assignments (various types, subjects)
2. Breaks them into realistic tasks
3. Schedules tasks in calendar (next 2 weeks)
4. Seeds some completed tasks (show progress)
5. Creates sample chat history
6. Sets up user preferences

**Sample Data**:
- "Machine Learning Final Project" (due in 2 weeks)
- "Shakespeare Essay" (due in 1 week)
- "Chemistry Exam" (due in 10 days)
- "Data Structures Problem Set" (due in 5 days)

### Demo Flow Script

**Recommended presentation order**:

1. **Landing Page** (0:30)
   - Show value proposition
   - Professional design

2. **Sign Up** (0:30)
   - Quick account creation
   - Or use pre-seeded account

3. **Connect Calendar** (0:30)
   - OAuth flow
   - Show permissions

4. **Dashboard Overview** (1:00)
   - Stats cards with numbers
   - Activity feed
   - Upcoming assignments

5. **Chat with AI** (2:00)
   - "I have a research paper on climate change due next Friday"
   - Watch AI break it down
   - Show phases created
   - Show tasks scheduled

6. **Calendar View** (1:00)
   - Drag and drop event
   - Show color coding
   - Show scheduled study sessions

7. **Assignment Details** (1:00)
   - Click assignment card
   - Show progress bar
   - Show phase breakdown
   - Mark task complete

8. **Q&A** (3:00)
   - Answer questions
   - Show additional features

**Total**: ~10 minutes

---

## Quick Wins

**< 30 minutes each - do between major tasks**

1. [ ] Add loading spinners to all buttons
2. [ ] Add success animations (checkmarks)
3. [ ] Improve button hover effects
4. [ ] Add page transitions
5. [ ] Add emoji to assignment types
6. [ ] Add tooltips to icons
7. [ ] Improve empty states ("No assignments yet!")
8. [ ] Add confirmation dialogs (delete actions)
9. [ ] Add keyboard shortcuts hints
10. [ ] Polish theme toggle animation

---

## Task Estimation Summary

### Critical Tasks (Must Do for Demo)
- **Total**: 12-16 hours
- Function executor: 6-8h
- Assignment CRUD: 3h
- Task CRUD: 2h
- Assignment UI: 3h
- Task UI: 2h
- Demo seeding: 1h

### High Priority (Makes Demo Impressive)
- **Total**: 11 hours
- Progress viz: 2h
- Chat history: 2h
- Activity feed: 2h
- Calendar polish: 2h
- Dashboard stats: 1h
- Assignment form: 2h

### Medium Priority (Nice Polish)
- **Total**: 15+ hours
- Various polish items

### Low Priority (Post-Demo)
- **Total**: 60+ hours
- Security, testing, production

---

## Recommended Development Order

### Sprint 1: Core Demo (12-16h)
**Goal**: Make it work end-to-end

1. 🔴-2: Complete function executor (6-8h)
2. 🔴-3: Assignment CRUD API (3h)
3. 🔴-4: Task CRUD API (2h)
4. 🔴-5: Assignment UI (3h)
5. 🔴-6: Task UI (2h)
6. 🔴-7: Demo seeding (1h)

**Result**: ✅ Complete demo flow works

### Sprint 2: Impressive Features (8-10h)
**Goal**: Wow the judges

1. 🟠-1: Progress visualizations (2h)
2. 🟠-2: Chat history (2h)
3. 🟠-3: Activity feed (2h)
4. 🟠-4: Calendar polish (2h)
5. 🟠-5: Dashboard stats (1h)

**Result**: ✅ Professional, impressive demo

### Sprint 3: Polish (Optional, 6-8h)
**Goal**: Extra shine

1. 🟡-1 through 🟡-10: Cherry-pick based on time
2. Quick wins
3. Bug fixes

**Result**: ✅ Refined presentation

---

## Development Tips

### For Local Demo

**DON'T worry about**:
- ❌ WebSocket authentication (trust yourself)
- ❌ Rate limiting (no abuse locally)
- ❌ Input sanitization (you control the inputs)
- ❌ Production deployment
- ❌ Testing (demo first, test later)

**DO focus on**:
- ✅ Features working end-to-end
- ✅ Visual polish and animations
- ✅ Impressive demo data
- ✅ Smooth user experience
- ✅ Quick setup/reset

### Debug Mode is Good!

Keep those console.log statements in `lib/google-calendar.ts` - they help you debug issues during demo prep!

### Quick Reset

Create a reset script to clear all data and re-seed:
```bash
npm run reset-demo  # Clear DB + Reseed
```

---

## Notes

- **Demo Mode**: This is optimized for local hackathon presentation
- **Security**: Intentionally simplified - address in "future work" section if asked
- **Time Estimates**: Single developer, focused work
- **Current Progress**: ~60% complete
- **To Demo-Ready**: ~40% remaining (12-16 hours)

**Focus**: Make it work, make it impressive, win the hackathon! 🏆

---

## How to Use This TODO

1. **Start with 🔴 CRITICAL** - Get core demo working
2. **Move to 🟠 HIGH** - Add impressive features
3. **Cherry-pick 🟡 MEDIUM** - Based on time
4. **Ignore 🟢 LOW** - Post-hackathon concerns

**For AI Assistants**: This is a DEMO-FOCUSED repo. Prioritize features and UX over security and testing. The user wants an impressive presentation, not production-ready code.

**Security Note**: This project is for local demonstration only. Security hardening moved to post-hackathon roadmap.

**Last Updated**: 2025-01-08 (Demo-focused revision)
