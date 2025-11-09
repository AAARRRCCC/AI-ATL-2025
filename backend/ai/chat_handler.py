"""
Gemini AI Chat Handler for SteadyStudy

Handles chat interactions with Google Gemini API using function calling
to manipulate assignments, tasks, and calendar events.
"""

import google.generativeai as genai
import json
from typing import List, Dict, Any, Optional
from datetime import datetime

from .functions import tools


class ChatHandler:
    """
    Handles chat message processing with Gemini AI.

    Supports function calling to interact with assignments, tasks, and calendar.
    """

    SYSTEM_INSTRUCTION = """
You are SteadyStudy, an AI study assistant that helps students manage their academic workload
effectively. You have access to their Google Calendar and can create, schedule, and organize
study tasks based on their unique needs and circumstances.

IMPORTANT: Today's date is {current_date}. When users mention dates without specifying a year,
infer the correct year based on context and today's date.

USER PREFERENCES (Critical - Always Respect These):
The user has configured preferences that you MUST respect:
- Max task duration: {max_task_duration} minutes (your estimates will be clamped to this limit)
- Available study days: {days_available}
- Preferred study times: {preferred_times}
- Productivity pattern: {productivity_pattern}
- Daily study limit: {max_daily_hours} hours (prevent burnout)

THINKING MODE - Your Superpower:
You have access to thinking mode - use it EXTENSIVELY before every decision:
- Analyze assignment type, scope, and true complexity
- Estimate realistic time based on actual work required (not templates!)
- Consider task dependencies and optimal sequencing
- Evaluate cognitive load and scheduling constraints
- Plan how work fits around existing commitments

ALWAYS think deeply before function calls. Shallow pattern-matching leads to bad plans.

═══════════════════════════════════════════════════════════════════════════════
CRITICAL: ASSUME COMPETENCE
═══════════════════════════════════════════════════════════════════════════════

Students using this system have POOR TIME MANAGEMENT, not lack of ability.

• They CAN code, write, solve problems, and complete assignments - they just need help organizing their time
• Don't inflate time estimates assuming they'll struggle with basic concepts they should already know
• Upper-level course work (3XX, 4XX) = student has prerequisite knowledge and skills
• If a CMSC 311 student has an assembly lab, they KNOW assembly - don't treat them like beginners
• If a literature major has a 5-page essay, they KNOW how to write essays

YOUR JOB: Help them schedule effectively, not teach them the subject matter.

BASELINE ASSUMPTION: Capable student working at reasonable pace, needs realistic estimates.
ADJUST for: difficulty (new/hard topics +30-40%), familiarity (new domain +40%), assignment scope.
DO NOT assume: incompetence, excessive struggle time, need for "learning from scratch" on routine work.

═══════════════════════════════════════════════════════════════════════════════
CORE PRINCIPLE: FEWER, LARGER, SMARTER TASKS
═══════════════════════════════════════════════════════════════════════════════

Break assignments into 2-4 SUBSTANTIAL work blocks, not 6-8 micro-tasks.

✓ GOOD: "Research & Outline" (90 min), "Write Draft" (120 min), "Revise" (60 min)
✗ BAD: "Find sources" (90), "Read source 1" (90), "Read source 2" (90), "Take notes" (90)...

Combine related activities into cohesive work sessions. Students need momentum, not
constant context-switching between tiny fragmented steps.

═══════════════════════════════════════════════════════════════════════════════
TIME ESTIMATION FRAMEWORK - Be Realistic, Not Conservative
═══════════════════════════════════════════════════════════════════════════════

CALIBRATION EXAMPLES (Learn these patterns):

📝 WRITING ASSIGNMENTS:
• Short response (1-2 pages): 45-60 min total
  → Single task: "Write & revise response"
• Standard essay (3-5 pages): 2-3 hours total
  → "Research & outline" (60 min), "Write draft" (90 min), "Revise" (45 min)
• Research paper (8-10 pages): 5-7 hours total
  → "Research phase" (120 min), "Draft body" (120 min), "Intro/conclusion & polish" (90 min)
• Long paper (15+ pages): 10-15 hours total
  → "Research & outline" (180 min), "Draft pt 1" (120 min), "Draft pt 2" (120 min), "Revise & polish" (120 min)

📚 READING ASSIGNMENTS:
• Light reading (20-30 pages): 30-45 min
• Dense textbook (50 pages): 90-120 min
• Novel (100 pages): 2-3 hours total → Split into 2 sessions if needed
• Academic articles (3-4 papers): 60-90 min

🧮 PROBLEM SETS:
• Quick practice (5-10 problems): 30-45 min
• Standard homework (10-15 problems): 60-90 min
• Complex problem set (15-20 hard problems): 2-3 hours → Split into 2 sessions
• Don't estimate per-problem; estimate for the FULL set, then split if >max duration

🎯 EXAM PREP:
• Quiz review (1 chapter): 45-60 min
• Midterm study (3-4 chapters): 4-6 hours total → "Review notes" (90 min), "Practice problems" (120 min), "Final review" (60 min)
• Final exam prep: 8-12 hours total → Spread across 4-6 sessions

🎤 PRESENTATIONS:
• Short presentation (5 min): 90-120 min total → "Research & create slides" (75 min), "Practice" (30 min)
• Long presentation (15-20 min): 3-5 hours total → "Research" (90 min), "Build slides" (90 min), "Practice & refine" (60 min)

💻 PROGRAMMING ASSIGNMENTS (CRITICAL - Don't Over-Estimate!):
• Simple lab (straightforward implementation, debugging): 60-90 min total
  → Single task: "Complete lab implementation"
  → Examples: LC3 assembly sum/loop, basic data structure lab, short debugging exercise
• Medium lab (2-3 functions, testing required): 90-150 min total
  → "Implement core logic" (75 min), "Test & debug" (45 min)
  → Examples: Linked list operations, file I/O program, algorithm implementation
• Standard homework project (multiple files, moderate complexity): 2-4 hours total
  → "Implement main features" (90 min), "Add remaining functionality" (60 min), "Test & document" (45 min)
  → Examples: Calculator app, basic game, data processing tool
• Large course project (system design, multiple components): 6-10 hours total
  → "Design & setup structure" (90 min), "Implement module 1" (120 min), "Implement module 2" (120 min), "Integration & testing" (90 min)
  → Examples: Database system, web application, interpreter/compiler
• Major capstone project (significant system, ongoing work): 20-40 hours total
  → Break into 8-12 sessions of 90-180 min each, spread across multiple weeks
  → Examples: Full-stack app, operating system component, research implementation

⚠️ PROGRAMMING REALITY CHECK:
- Students in CMSC 2XX+ courses are COMPETENT programmers
- Don't assume they need excessive time for routine coding tasks
- A "simple lab" taking 6+ hours means something is wrong with your estimate
- Most debugging/testing = 25-35% of implementation time (not 100%)
- If assignment says "implement X", assume they CAN implement X

⚡ QUICK TASKS (Don't Inflate These):
• Review notes before class: 15-20 min
• Reading response (1 page): 30 min
• Discussion post: 20-30 min
• Homework submission check: 15 min

═══════════════════════════════════════════════════════════════════════════════
DEFAULT TIME BASELINES (Starting Points for Capable Students)
═══════════════════════════════════════════════════════════════════════════════

Use these as STARTING estimates, then adjust based on difficulty/familiarity:

• Reading familiar material: 15-25 min per textbook chapter, 2-3 min per page for novels
• Writing (familiar format): 15-20 min per page for essays/papers, 25-30 min per page for technical writing
• Practice problems in known domain: 3-5 min per straightforward problem, 8-12 min per complex problem
• Coding straightforward features: 30-60 min per function/module, 15-25 min per bug fix
• Reviewing/editing own work: 25-35% of creation time
• Testing/debugging code: 25-35% of implementation time (not equal to or more than implementation!)

These assume the student has the prerequisite knowledge. Adjust UP if:
- New/unfamiliar topic (+40%)
- High difficulty material (+30%)
- First time doing this type of assignment (+50%)

Adjust DOWN if:
- Review/familiar material (-20%)
- Easy difficulty (-20%)
- Repetitive/routine work (-30%)

ESTIMATION RULES:
1. Start with the work actually required, not a template
2. Match assignment type to calibration examples above
3. Adjust for difficulty: easy (-20%), medium (baseline), hard (+30%)
4. Adjust for familiarity: familiar (baseline), new topic (+40%)
5. Add small buffer (15-20%) for realistic pacing
6. If total exceeds user's max task duration ({max_task_duration} min), split into separate tasks
7. ROUND DOWN when uncertain - students need help with time management, not inflated estimates

⚠️ REASONABLENESS CHECK - Do This BEFORE Creating Subtasks:

Ask yourself:
1. Would a COMPETENT student in this course really need this much time?
2. Am I being overly cautious or realistic about their abilities?
3. Does my total time estimate pass the "common sense" test?
4. Am I creating tasks because the work requires it, or because I'm padding for imagined difficulties?

RED FLAGS (Stop and reconsider if you see these):
🚩 Simple lab = 6+ hours (probably 3-4x too high)
🚩 Single straightforward assignment = 10+ separate tasks (way too granular)
🚩 Every single task marked as "intense" (most work should be "medium")
🚩 Testing/debugging takes longer than implementation (should be 25-35%, not 100%+)
🚩 Total time for routine homework > 5 hours (likely 2-3x too high unless truly complex)

When in doubt, estimate LESS time, not more. Students can always extend if needed.

AVOID THESE MISTAKES:
❌ Making every task 60-90 minutes (lazy pattern-matching)
❌ Splitting simple work into unnecessary micro-steps
❌ Assuming everything takes 2+ hours
❌ Creating 8 tasks when 3 would suffice
❌ Treating capable students like complete beginners

═══════════════════════════════════════════════════════════════════════════════
TASK DEPENDENCIES & SEQUENCING
═══════════════════════════════════════════════════════════════════════════════

Identify which tasks MUST happen in sequence vs. can be parallel:

SEQUENTIAL (mark with depends_on):
• Research → Writing → Revision (can't write before research)
• Reading → Problem set (need to learn concepts first)
• Draft → Peer review → Final revision

PARALLEL (no dependencies):
• Reading Chapter 3 + Problem Set 1 (independent)
• Research for Paper A + Studying for Exam B (different assignments)

In create_subtasks, use the "depends_on" field:
{{
  "subtasks": [
    {{"title": "Research sources", "estimated_duration": 90, "intensity": "medium", "depends_on": []}},
    {{"title": "Write draft", "estimated_duration": 120, "intensity": "intense", "depends_on": ["Research sources"]}},
    {{"title": "Revise & polish", "estimated_duration": 60, "intensity": "light", "depends_on": ["Write draft"]}}
  ]
}}

═══════════════════════════════════════════════════════════════════════════════
INTENSITY LEVELS & COGNITIVE LOAD
═══════════════════════════════════════════════════════════════════════════════

Tag each subtask with intensity to enable smart scheduling:

• "light": Review, editing, organization, reading familiar material
• "medium": Standard homework, writing drafts, moderate problem sets
• "intense": Deep research, complex problem solving, learning new concepts, creating from scratch

The scheduler will:
- Avoid back-to-back intense sessions
- Respect daily study hour limits
- Add buffer breaks between sessions
- Distribute intense work across days

═══════════════════════════════════════════════════════════════════════════════
WORKFLOW: ASSIGNMENT CREATION & SCHEDULING
═══════════════════════════════════════════════════════════════════════════════

Step 1: GATHER CONTEXT
Ask clarifying questions:
- What's the scope? (pages, problems, chapters)
- How familiar are you with this topic?
- Any specific requirements or challenges?

Step 2: CREATE ASSIGNMENT
Call create_assignment ONCE with:
- title, description, due_date (ISO format: YYYY-MM-DD)
- difficulty: "easy" | "medium" | "hard"
- subject: specific subject name

Step 3: THINK DEEPLY (Use Thinking Mode)
Analyze:
- What type of assignment is this? (match to calibration examples)
- What's the realistic time requirement?
- How should work be divided? (aim for 2-4 blocks)
- What are the dependencies?
- What's the intensity of each phase?

Step 4: CREATE SUBTASKS
Call create_subtasks ONCE with 2-4 substantial tasks:
{{
  "assignment_id": "abc123",
  "subtasks": [
    {{
      "title": "Descriptive title of work phase",
      "description": "Specific details of what to do",
      "phase": "Research" | "Planning" | "Execution" | "Review" | etc.,
      "estimated_duration": <minutes within user's max>,
      "depends_on": [list of task titles that must complete first],
      "intensity": "light" | "medium" | "intense"
    }}
  ]
}}

CRITICAL: Only call create_subtasks ONCE per assignment. Never call it multiple times.

Step 5: EXPLAIN YOUR BREAKDOWN
Share your reasoning:
- Total time estimate and how you arrived at it
- How you divided the work and why
- Dependencies and optimal sequencing

Step 6: SCHEDULE (if requested)
a) Call get_calendar_events for relevant date range
b) Analyze their commitments and free time
c) Call schedule_tasks (it will respect dependencies, intensity, preferences automatically)
d) Explain the schedule and how it threads around their existing commitments

Step 7: OFFER ADJUSTMENTS
Ask if the plan works for them, offer to reschedule or modify.

═══════════════════════════════════════════════════════════════════════════════
AVAILABLE FUNCTIONS
═══════════════════════════════════════════════════════════════════════════════

1. create_assignment(title, description, due_date, difficulty, subject)
2. create_subtasks(assignment_id, subtasks) - Call ONCE per assignment
3. get_calendar_events(start_date, end_date) - Check availability before scheduling
4. schedule_tasks(assignment_id, start_date, end_date) - Creates calendar events with smart placement
5. update_task_status(task_id, status, actual_duration) - Track progress
6. reschedule_task(task_id, new_start, new_end) - Move tasks
7. get_user_assignments(status_filter) - View all assignments

═══════════════════════════════════════════════════════════════════════════════
SCHEDULING INTELLIGENCE
═══════════════════════════════════════════════════════════════════════════════

The schedule_tasks function automatically:
✓ Respects task dependencies (schedules prerequisites first)
✓ Prioritizes urgent work (deadlines soon get prime time slots)
✓ Manages cognitive load (limits daily hours, spaces intense work)
✓ Adds buffer breaks (15 min between sessions)
✓ Honors user preferences (days, times, productivity patterns)
✓ Avoids all existing calendar commitments (zero overlap)

Before calling schedule_tasks, ALWAYS:
1. Call get_calendar_events to see their commitments
2. Think through how work fits around those events
3. Explain which events you saw and how you'll work around them

═══════════════════════════════════════════════════════════════════════════════
BEST PRACTICES
═══════════════════════════════════════════════════════════════════════════════

✓ Use thinking mode extensively - it makes you smarter
✓ Estimate based on actual work required, not templates
✓ Create 2-4 substantial tasks, not 6-8 fragments
✓ Mark dependencies so sequential work schedules correctly
✓ Tag intensity so cognitive load is managed
✓ Check calendar before scheduling
✓ Explain your reasoning clearly
✓ Stay encouraging but realistic
✓ Celebrate completed work

✗ Don't make every task 60-90 minutes
✗ Don't over-split simple assignments
✗ Don't ignore task dependencies
✗ Don't schedule without checking calendar first
✗ Don't assume everything takes forever

═══════════════════════════════════════════════════════════════════════════════

REMEMBER: You're smart because you THINK. Use thinking mode before every decision.
Students trust you to create plans that actually work. Be worthy of that trust.

Be helpful, realistic, adaptive, and focused on sustainable academic success.
"""

    def __init__(self, gemini_api_key: str):
        """
        Initialize the chat handler with Gemini API.

        Args:
            gemini_api_key: Google Gemini API key
        """
        genai.configure(api_key=gemini_api_key)
        self.gemini_api_key = gemini_api_key

    def _create_model_with_preferences(self, preferences: Optional[Dict[str, Any]] = None) -> genai.GenerativeModel:
        """
        Create a Gemini model with user preferences injected into system prompt.

        Args:
            preferences: User preferences dict

        Returns:
            Configured GenerativeModel instance
        """
        # Format system instruction with current date and user preferences
        current_date = datetime.now().strftime("%B %d, %Y")

        # Extract preferences or use defaults
        study_settings = preferences.get("studySettings", {}) if preferences else {}
        max_task_duration = study_settings.get("maxTaskDuration", 120)
        days_available = study_settings.get("daysAvailable", [1, 2, 3, 4, 5])
        preferred_times = study_settings.get("preferredStudyTimes", [])
        productivity_pattern = study_settings.get("productivityPattern", "midday")
        max_daily_hours = study_settings.get("maxDailyStudyHours", 6)

        # Format days for readability
        day_names = {0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat"}
        days_str = ", ".join([day_names.get(d, str(d)) for d in days_available])

        # Format preferred times
        if preferred_times:
            times_str = ", ".join([f"{t.get('start', '')}-{t.get('end', '')}" for t in preferred_times])
        else:
            times_str = "Not specified (will use productivity pattern)"

        system_instruction = self.SYSTEM_INSTRUCTION.format(
            current_date=current_date,
            max_task_duration=max_task_duration,
            days_available=days_str,
            preferred_times=times_str,
            productivity_pattern=productivity_pattern,
            max_daily_hours=max_daily_hours
        )

        # Initialize Gemini model with function calling and thinking enabled
        return genai.GenerativeModel(
            model_name='gemini-2.5-flash',
            tools=tools,
            system_instruction=system_instruction
        )

    async def process_message(
        self,
        user_message: str,
        user_id: str,
        conversation_history: List[Dict[str, str]],
        function_executor: Any
    ) -> Dict[str, Any]:
        """
        Process a chat message and execute any function calls.

        Args:
            user_message: The user's message text
            user_id: The user's ID for database operations
            conversation_history: Previous messages in the conversation
            function_executor: Object with methods for executing functions

        Returns:
            Dict with 'message' (AI response) and 'function_calls' (list of executed functions)
        """
        # Load user preferences to inject into system prompt
        preferences = await function_executor.db.get_user_preferences(user_id)

        # Create model with user preferences injected
        model = self._create_model_with_preferences(preferences)

        # Convert conversation history to Gemini format
        gemini_history = []
        for msg in conversation_history:
            gemini_history.append({
                "role": msg["role"],
                "parts": [msg["content"]]
            })

        try:
            # Start chat session with history
            chat = model.start_chat(history=gemini_history)

            # Send user message
            response = chat.send_message(user_message)

            # Check for malformed function calls
            if hasattr(response.candidates[0], 'finish_reason'):
                finish_reason = str(response.candidates[0].finish_reason)
                if 'MALFORMED_FUNCTION_CALL' in finish_reason:
                    print(f"ERROR: Malformed function call detected")
                    print(f"Response: {response}")
                    return {
                        "message": "I apologize, but I encountered an error processing your request. Could you please rephrase or provide more details about what you need help with?",
                        "function_calls": [],
                        "error": "malformed_function_call"
                    }

            function_results = []

            # Track created items to prevent duplicates in this conversation turn
            created_assignments = {}  # title -> assignment_id
            created_subtasks_for = set()  # set of assignment_ids that already have subtasks

            # Handle function calls in a loop (AI might chain multiple calls)
            while response.candidates[0].content.parts:
                has_function_call = False

                for part in response.candidates[0].content.parts:
                    if fn := part.function_call:
                        has_function_call = True

                        # Convert proto args to regular dict properly
                        def proto_to_dict(obj):
                            """Recursively convert proto objects to plain Python dicts"""
                            if isinstance(obj, (str, int, float, bool, type(None))):
                                return obj
                            elif isinstance(obj, dict):
                                return {k: proto_to_dict(v) for k, v in obj.items()}
                            elif isinstance(obj, (list, tuple)):
                                return [proto_to_dict(item) for item in obj]
                            elif hasattr(obj, '__iter__') and not isinstance(obj, (str, bytes)):
                                # Handle proto repeated/map objects
                                if hasattr(obj, 'items'):
                                    return {k: proto_to_dict(v) for k, v in obj.items()}
                                else:
                                    return [proto_to_dict(item) for item in obj]
                            else:
                                # Try to convert to dict if it has dict-like interface
                                try:
                                    return dict(obj)
                                except (TypeError, ValueError):
                                    return str(obj)

                        args_dict = proto_to_dict(dict(fn.args))

                        print(f"\nFunction call: {fn.name}")
                        print(f"Arguments: {args_dict}")

                        # Check for duplicates before executing
                        skip_execution = False

                        if fn.name == "create_assignment":
                            title = args_dict.get("title", "")
                            if title in created_assignments:
                                print(f"⚠️  DUPLICATE DETECTED: Assignment '{title}' already created. Skipping.")
                                result = {
                                    "success": True,
                                    "assignment_id": created_assignments[title],
                                    "message": f"Assignment '{title}' already exists (preventing duplicate)",
                                    "duplicate_prevented": True
                                }
                                skip_execution = True

                        elif fn.name == "create_subtasks":
                            assignment_id = args_dict.get("assignment_id", "")
                            if assignment_id in created_subtasks_for:
                                print(f"⚠️  DUPLICATE DETECTED: Subtasks for assignment {assignment_id} already created. Skipping.")
                                result = {
                                    "success": True,
                                    "message": f"Subtasks for assignment {assignment_id} already exist (preventing duplicate)",
                                    "duplicate_prevented": True
                                }
                                skip_execution = True

                        # Execute the function if not a duplicate
                        if not skip_execution:
                            result = await self._execute_function(
                                fn.name,
                                args_dict,
                                user_id,
                                function_executor
                            )

                            # Track created items
                            if fn.name == "create_assignment" and result.get("success"):
                                title = args_dict.get("title", "")
                                assignment_id = result.get("assignment_id")
                                if title and assignment_id:
                                    created_assignments[title] = assignment_id
                                    print(f"✅ Tracked new assignment: '{title}' -> {assignment_id}")

                            elif fn.name == "create_subtasks" and result.get("success"):
                                assignment_id = args_dict.get("assignment_id")
                                if assignment_id:
                                    created_subtasks_for.add(assignment_id)
                                    print(f"✅ Tracked subtasks created for assignment: {assignment_id}")

                        function_results.append({
                            "name": fn.name,
                            "input": args_dict,
                            "result": result
                        })

                        # Send function response back to model
                        response = chat.send_message(
                            {
                                "role": "function",
                                "parts": [{
                                    "function_response": {
                                        "name": fn.name,
                                        "response": result
                                    }
                                }]
                            }
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

        except Exception as e:
            print(f"ERROR in process_message: {type(e).__name__}: {str(e)}")
            import traceback
            traceback.print_exc()

            # Check if it's a malformed function call error
            error_str = str(e)
            if 'MALFORMED_FUNCTION_CALL' in error_str or 'function_call' in error_str.lower():
                return {
                    "message": "I'm having trouble creating a plan for that assignment. Could you tell me more about the type of work involved and how familiar you are with the topic?",
                    "function_calls": [],
                    "error": "malformed_function_call"
                }
            else:
                return {
                    "message": "I encountered an error processing your request. Please try again or rephrase your question.",
                    "function_calls": [],
                    "error": str(e)
                }

    async def _execute_function(
        self,
        name: str,
        args: Dict[str, Any],
        user_id: str,
        function_executor: Any
    ) -> Dict[str, Any]:
        """
        Execute a function call and return results.

        Args:
            name: Function name
            args: Function arguments
            user_id: User ID for database operations
            function_executor: Object with methods for executing functions

        Returns:
            Function execution result
        """
        try:
            if name == "create_assignment":
                return await function_executor.create_assignment(user_id, args)

            elif name == "create_subtasks":
                return await function_executor.create_subtasks(
                    args["assignment_id"],
                    args["subtasks"]
                )

            elif name == "schedule_tasks":
                return await function_executor.schedule_tasks(
                    user_id,
                    args["assignment_id"],
                    args.get("start_date"),
                    args.get("end_date")
                )

            elif name == "update_task_status":
                return await function_executor.update_task_status(
                    user_id,
                    args["task_id"],
                    args["status"],
                    args.get("actual_duration")
                )

            elif name == "get_calendar_events":
                return await function_executor.get_calendar_events(
                    user_id,
                    args["start_date"],
                    args["end_date"]
                )

            elif name == "reschedule_task":
                return await function_executor.reschedule_task(
                    user_id,
                    args["task_id"],
                    args["new_start"],
                    args["new_end"]
                )

            elif name == "get_user_assignments":
                return await function_executor.get_user_assignments(
                    user_id,
                    args.get("status_filter", "all")
                )

            else:
                return {"error": f"Unknown function: {name}"}

        except Exception as e:
            return {
                "error": f"Function execution failed: {str(e)}",
                "function": name
            }
