# Study Autopilot - Complete Project Plan

## Core Concept

An automated study planner that breaks down assignments into scheduled, achievable work sessions using real calendar availability and smart task decomposition. Focused on reducing procrastination through momentum, not punishment.

-----

## Technical Architecture

### Stack Recommendation (Optimized for 24-36hr Hackathon)

**Frontend:**
- **Next.js 14** (App Router) - React framework with built-in routing, API routes, optimized performance
- **Tailwind CSS** - Utility-first CSS for rapid, modern styling
- **Framer Motion** - Production-ready animation library for smooth, impressive transitions
- **Shadcn/ui** - High-quality, customizable component library (copy-paste components)
- **Aceternity UI** / **Magic UI** - Premium landing page components with stunning effects

**State Management & Data:**
- **Zustand** or **Jotai** - Lightweight state management (simpler than Redux)
- **React Query** - Server state management, caching, and data fetching

**Backend:**
- **FastAPI** (Python) - Modern, fast, auto-documented API framework
- **SQLite** - Zero-config database (perfect for localhost demo)
- **Pydantic** - Data validation (built into FastAPI)

**Database:** SQLite (file-based, zero setup) - stores assignments, sub-tasks, user preferences, completion history

**Key APIs:**
- Google Calendar API (read/write) - Python client library
- Anthropic Claude API or OpenAI API (for assignment analysis and task breakdown)

**Development Tools:**
- **Docker Compose** - One-command setup for frontend + backend
- **Lucide Icons** - Clean, consistent icon set
- **Date-fns** - Lightweight date manipulation

### Why This Stack

**Speed:** Next.js + Tailwind enables rapid UI development. Shadcn/ui gives you beautiful components instantly.

**Visual Impact:** Framer Motion + Aceternity UI create stunning animations that wow judges in demos.

**Reliability:** FastAPI provides auto-generated docs and type safety. SQLite requires zero configuration.

**Demo-Ready:** Everything runs localhost with `docker-compose up` - no deployment headaches during the hackathon.

-----

## Data Models

### Assignment

```
- id
- title
- description
- due_date
- difficulty_level (1-5, user-rated or AI-estimated)
- subject/category
- source_file (PDF path or URL)
- total_estimated_hours
- status (not_started, in_progress, completed)
- created_at
```

### SubTask

```
- id
- assignment_id (foreign key)
- title
- description
- estimated_duration (minutes)
- order_index (sequence in the overall plan)
- status (pending, scheduled, completed, skipped)
- actual_duration (tracked when completed)
- calendar_event_id (Google Calendar event ID)
```

### CalendarBlock

```
- id
- subtask_id (foreign key)
- start_time
- end_time
- was_completed (boolean)
- completion_time (when they actually finished)
- skipped_reason (if applicable)
```

### UserPreferences

```
- id
- user_id
- productive_hours (array: e.g., [9,10,11,14,15,16])
- work_session_preference (25min Pomodoro, 50min blocks, 90min deep work)
- buffer_multiplier (default 1.25x)
- subjects_strength (JSON: {"Math": "strong", "Writing": "weak"})
- break_preferences
```

### ProgressStreak

```
- id
- user_id
- week_start_date
- completed_sessions
- planned_sessions
- streak_count (consecutive weeks with 80%+ completion)
```

-----

## User Flows

### 1. First-Time Setup

1. User installs/opens app
1. Google OAuth for Calendar access
1. Brief questionnaire:

- “When do you do your best work?” (morning/afternoon/evening)
- “Preferred work session length?” (25/50/90 min options)
- “Any subjects you find particularly easy/hard?”

1. Syncs calendar, shows dashboard

### 2. Adding an Assignment

**Path A: Upload PDF**

1. Drag/drop or browse for assignment PDF
1. App extracts: due date, requirements, estimated length
1. Shows extraction: “Is this right? Due Nov 15, 10-page research paper on climate policy”
1. User confirms or edits
1. Asks: “How familiar are you with this topic?” (New/Somewhat/Very)
1. Calculates difficulty multiplier

**Path B: Manual Entry**

1. Clicks “Add Assignment”
1. Form: Title, due date, description, type (essay/project/problem set/reading)
1. Same familiarity question

### 3. Breaking Down an Assignment (The Core Flow)

**Trigger:** User clicks “Plan This” or app prompts for upcoming due dates

**Step 1: Analysis**

- AI reads assignment details/PDF
- Identifies key components (e.g., “Research phase, outline, first draft, revision, final draft”)
- Estimates time for each component based on:
  - Assignment type
  - Page count/scope
  - User’s difficulty rating
  - Historical data (if available)

**Step 2: Calendar Scan**

- Pulls next 2 weeks (or until due date) from Google Calendar
- Identifies free blocks ≥45 minutes
- Filters by user preferences (avoids late-night if they said they’re not evening-productive)
- Applies context heuristics:
  - Don’t schedule immediately after 3+ hour class blocks
  - Weekend mornings often good for deep work
  - Buffer around meal times

**Step 3: Proposed Schedule**
Shows UI like:

```
Climate Policy Paper - 8 total hours
─────────────────────────────────────
Thursday Nov 9, 2-4pm (2hrs)
 ├─ Research & collect 5 sources
 └─ Create preliminary outline

Saturday Nov 11, 10am-1pm (3hrs)  
 ├─ Write introduction + thesis
 └─ Draft body paragraph 1-2

Monday Nov 13, 3-5pm (2hrs)
 └─ Complete remaining body paragraphs

Wednesday Nov 15, 11am-12pm (1hr)
 └─ Revision pass & formatting
```

**Step 4: User Review**

- “Does this timeline work for you?”
- Can drag blocks to different times
- Can adjust estimated durations
- “Add buffer time?” toggle (adds 25% to each block)

**Step 5: Commit**

- Clicks “Lock It In”
- App creates Google Calendar events with:
  - Title: “[Study Autopilot] Research & collect 5 sources - Climate Paper”
  - Description: Specific task goals
  - Link back to app for “I’m stuck” button

-----

## Key Features Detail

### Auto-Rescheduling Logic

**Scenario 1: Missed a block entirely**

- Cron job checks completed status 30 min after scheduled end time
- If not marked complete:
  - Finds next available slot (same day if possible)
  - Moves the sub-task
  - Updates calendar event
  - Shows toast notification: “Moved ‘Research sources’ to 7pm tonight. Still on track!”

**Scenario 2: Partial completion**

- User clicks “I finished some of this” (spent 1hr of 2hr block)
- Estimates remaining time
- Reschedules remainder as smaller block

**Scenario 3: Multiple misses (3+ in a row)**

- Triggers re-plan mode
- “Your schedule changed—let’s adjust the timeline”
- Re-analyzes available time until due date
- Proposes new, more realistic schedule
- Shows: “We’ll need to add 1 more hour this weekend to stay on track”

### The “I’m Stuck” System

Big button during any scheduled work session:

**Options:**

1. “This is taking longer than expected”
   → Extends current block, pushes next items
1. “I don’t understand the assignment”
   → Links to resources, suggests office hours time
1. “I’m too tired for this”
   → Moves to tomorrow, schedules easier task instead if available
1. “I need a break”
   → Starts 10-min timer, gentle return notification

### Progress Visualization

**Dashboard shows:**

- **Assignment progress bar:** Visual breakdown of completed vs remaining sub-tasks
- **Hour counter:** “5.5 / 8 hours completed” with satisfying fill animation
- **This week’s focus:** Current assignment + what’s coming
- **Momentum tracker:** “4/5 planned sessions this week ⚡” (not called a streak to reduce pressure)

**Completed task celebration:**

- Checkmark animation
- Updates hour counter
- Shows what’s next: “Nice! Next up: Draft body paragraphs (Sat 10am)”

### Weekly Reset Ritual

**Sunday 8pm notification** (customizable time):
“Let’s plan next week”

**Flow:**

1. Shows upcoming due dates
1. “Any new assignments to add?”
1. Reviews current assignments: “Climate paper is 60% done, on track for Wednesday”
1. Scans calendar for next week
1. “I’ve scheduled 6 work sessions totaling 11 hours. Look good?”
1. User approves or adjusts
1. “You’re set. See you tomorrow!”

### Context-Aware Scheduling Intelligence

**Time-of-day preferences:**

- Tracks when user actually completes tasks vs skips
- After 3+ weeks, learns patterns
- Starts preferring those times automatically

**Task-type matching:**

- Creative work (writing, brainstorming) → morning slots (if user is morning-productive)
- Mechanical work (formatting, citations) → evening ok
- Problem-solving → when most alert

**Energy level estimation:**

- After back-to-back classes → lighter tasks
- Start of day → harder tasks
- Friday evening → asks before scheduling anything

-----

## UI/UX Specifications

### Landing Page (Daily View)

```
┌─────────────────────────────────────────────┐
│  Study Autopilot        👤 [Settings]       │
├─────────────────────────────────────────────┤
│                                             │
│  Friday, November 7                         │
│  ────────────────────────────               │
│  Today's Schedule:                          │
│                                             │
│  ⏰ 2:00 PM - 4:00 PM                       │
│  📝 Research & collect 5 sources           │
│      Climate Policy Paper                   │
│      [Start Session]                        │
│                                             │
│  ─────────────────────────────              │
│                                             │
│  Upcoming:                                  │
│  • Sociology Reading (Sun 10am)            │
│  • Math Problem Set (Mon 3pm)              │
│                                             │
│  ─────────────────────────────              │
│                                             │
│  Active Assignments:                        │
│                                             │
│  📄 Climate Policy Paper                    │
│  ▓▓▓▓▓▓▓▓▓░░░░░  60% (Due Nov 15)         │
│  5.5/8 hours completed                      │
│                                             │
│  📚 Sociology Reading Assignment            │
│  ▓▓░░░░░░░░░░░░  15% (Due Nov 18)         │
│  Not yet scheduled → [Plan This]            │
│                                             │
│  [+ Add Assignment]                         │
│                                             │
└─────────────────────────────────────────────┘
```

### During Work Session

```
┌─────────────────────────────────────────────┐
│  Research & collect 5 sources               │
│  Climate Policy Paper                       │
├─────────────────────────────────────────────┤
│                                             │
│  ⏱️  1:15:00 / 2:00:00                      │
│                                             │
│  Goal: Find 5 credible sources on climate   │
│  policy, at least 2 peer-reviewed           │
│                                             │
│  ─────────────────────────────              │
│                                             │
│  [✓ I'm Done]    [I'm Stuck]    [Take Break]│
│                                             │
└─────────────────────────────────────────────┘
```

### Assignment Breakdown Preview (Before Scheduling)

```
┌─────────────────────────────────────────────┐
│  Plan: Climate Policy Paper                 │
│  Due November 15 (8 days)                   │
├─────────────────────────────────────────────┤
│                                             │
│  I found 14 hours of free time. Here's the │
│  plan to get this done:                     │
│                                             │
│  Phase 1: Research (4 hours)                │
│  📅 Thu Nov 9, 2-4pm                        │
│      └─ Find & read 5 sources              │
│  📅 Fri Nov 10, 4-6pm                       │
│      └─ Take notes & create outline        │
│                                             │
│  Phase 2: Drafting (6 hours)                │
│  📅 Sat Nov 11, 10am-1pm                    │
│      └─ Introduction + 2 body paragraphs   │
│  📅 Sun Nov 12, 2-5pm                       │
│      └─ Remaining body + conclusion        │
│                                             │
│  Phase 3: Revision (2 hours)                │
│  📅 Tue Nov 14, 3-5pm                       │
│      └─ Edit, polish, format               │
│                                             │
│  ─────────────────────────────              │
│  Total: 12 hours (includes 25% buffer)      │
│                                             │
│  [Looks Good!]  [Adjust Timeline]           │
│                                             │
└─────────────────────────────────────────────┘
```

-----

## AI Integration Details

### Assignment Analysis Prompt Template

```
You are analyzing a student assignment. Extract and estimate:

Assignment: {title}
Due Date: {due_date}
Content: {pdf_text or description}
Student familiarity: {familiarity_level}

Provide:
1. Key components/phases (e.g., research, outline, draft, revision)
2. Estimated hours for each phase
3. Specific tasks within each phase
4. Any dependencies (must do X before Y)

Format as JSON:
{
  "phases": [
    {
      "name": "Research",
      "estimated_hours": 4,
      "tasks": [
        {"description": "Find 5 credible sources", "hours": 2},
        {"description": "Read and take notes", "hours": 2}
      ]
    }
  ],
  "total_hours": 12,
  "difficulty_notes": "Requires understanding of policy frameworks"
}
```

### Scheduling Algorithm

```python
def create_schedule(subtasks, calendar_events, user_prefs, due_date):
    available_blocks = find_free_time(
        calendar_events,
        start=datetime.now(),
        end=due_date,
        min_duration=45  # minutes
    )
    
    # Filter by user preferences
    available_blocks = filter_by_productivity_hours(
        available_blocks,
        user_prefs.productive_hours
    )
    
    # Apply context heuristics
    available_blocks = apply_context_rules(
        available_blocks,
        calendar_events  # check surrounding events
    )
    
    # Sort subtasks by dependency order
    ordered_tasks = topological_sort(subtasks)
    
    schedule = []
    for task in ordered_tasks:
        # Apply buffer multiplier
        needed_duration = task.estimated_duration * user_prefs.buffer_multiplier
        
        # Find best-fit block
        best_block = find_best_block(
            available_blocks,
            needed_duration,
            task.type,  # matches to time of day
            user_prefs
        )
        
        if best_block:
            schedule.append({
                'task': task,
                'start': best_block.start,
                'end': best_block.start + needed_duration
            })
            available_blocks.remove(best_block)
        else:
            # Not enough time - flag to user
            raise InsufficientTimeError(
                f"Can't fit all work before {due_date}"
            )
    
    return schedule
```

-----

## MVP vs Future Features

### MVP (Version 1.0) - Launch This First

**Must Have:**

- Google Calendar OAuth & sync
- Manual assignment entry (skip PDF upload initially)
- AI-powered task breakdown
- Automatic scheduling with user approval
- Basic auto-rescheduling (simple: move to next day)
- Progress tracking (% complete, hours done)
- “Mark complete” button
- Weekly reset prompt

**Can Skip for MVP:**

- PDF upload/parsing
- “I’m stuck” button (just have “Mark incomplete” option)
- Advanced context-awareness (use simpler heuristics)
- Learning from completion patterns
- Difficulty rating system (default to medium difficulty)

-----

## Technical Implementation Priorities

### Phase 1: Backend Core (Week 1-2)

1. Set up Flask/FastAPI server
1. PostgreSQL database + models
1. Google Calendar API integration (OAuth, read/write)
1. Basic scheduling algorithm (no AI yet - use rule-based estimation)
1. CRUD endpoints for assignments and subtasks

### Phase 2: AI Integration (Week 2-3)

1. Integrate OpenAI/Claude API
1. Build assignment analysis prompt
1. Task breakdown logic
1. Time estimation based on assignment type

### Phase 3: Frontend (Week 3-4)

1. React dashboard setup
1. Landing page with today’s schedule + assignments
1. Assignment creation form
1. Schedule review/approval UI
1. Progress visualization

### Phase 4: Automation (Week 4-5)

1. Auto-rescheduling logic
1. Cron jobs for checking completion
1. Notification system (web notifications initially)
1. Weekly reset prompt

### Phase 5: Polish (Week 5-6)

1. Personality/copy writing (encouraging messages)
1. Smooth animations
1. Error handling & edge cases
1. User onboarding flow
1. Settings page

-----

## Edge Cases to Handle

### Calendar Issues

- **All-day events:** Treat as unavailable unless marked “free”
- **Overlapping events:** Should be impossible from Google, but check
- **Past due dates:** Warn user, suggest talking to professor
- **Insufficient time:** “You have 8 hours of work but only 4 hours free before due date. Want to adjust priorities?”

### Assignment Complexity

- **Vague assignments:** Ask follow-up questions to clarify scope
- **Group projects:** Note dependencies on others, flag coordination time
- **Multi-part assignments:** Break each part into separate sub-assignment

### User Behavior

- **Never completing tasks:** After 2 weeks of <30% completion, prompt: “Seems like these timelines aren’t working. Want to replan everything?”
- **Always going over time:** Increase buffer multiplier automatically
- **Consistently crushing estimates:** Decrease future estimates, celebrate wins

### Technical Failures

- **Calendar API down:** Cache last sync, work in “offline” mode
- **AI API failure:** Fall back to template-based breakdown
- **Concurrent edits:** User changes while app is rescheduling - user’s manual edits take precedence

-----

## Success Metrics to Track

**Engagement:**

- Daily active use
- Completion rate (scheduled sessions actually done)
- Time to first assignment planned (onboarding friction)

**Effectiveness:**

- % of assignments submitted on time
- Average hours scheduled vs actual hours needed
- Reschedule frequency (too high = bad estimates)

**User Satisfaction:**

- Return rate week-over-week
- Momentum tracker percentage
- Manual schedule overrides (high = algo not working)

-----

## Launch Checklist

**Before Beta:**

- [ ] Test with 5 students manually for 2 weeks
- [ ] Fix critical bugs from beta
- [ ] Write good error messages
- [ ] Privacy policy (handling calendar data)
- [ ] Backup system for database

**V1.0 Launch:**

- [ ] Deploy on reliable hosting (Railway, Render, or similar)
- [ ] Set up monitoring (Sentry for errors)
- [ ] Usage analytics (PostHog or similar)
- [ ] Feedback form in-app
- [ ] Basic landing page explaining concept

-----