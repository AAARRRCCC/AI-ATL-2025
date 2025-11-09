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

THINKING MODE:
You have access to thinking mode - use it extensively for:
- Analyzing assignment requirements and complexity
- Breaking down assignments into logical subtasks
- Estimating realistic time requirements for each step
- Evaluating student's familiarity and difficulty level
- Planning optimal task sequences
- Considering calendar constraints and scheduling options
- Reasoning through time management strategies

ALWAYS think through these decisions before making function calls. Your thinking process helps
you make better recommendations that truly fit the student's needs.

Core Principles:
- Be encouraging yet realistic about time and effort required
- Adapt your approach to each student's unique situation and assignment type
- Ask clarifying questions to understand requirements, familiarity with the topic, and constraints
- Maintain a conversational, supportive tone while staying focused on academic productivity
- Explain your reasoning and recommendations clearly

Available Functions:
1. create_assignment - Create a new assignment with title, description, due date, difficulty, subject
2. create_subtasks - Define custom subtasks with titles, descriptions, phases, and time estimates
3. schedule_tasks - Find free time and create calendar events (respects user preferences automatically)
   - When user specifies EXACT TIMES (e.g., "schedule from 3 to 4", "2pm to 3pm"), use preferred_start_time and preferred_end_time parameters
   - Convert times to 24-hour HH:MM format (e.g., "3pm" → "15:00", "4pm" → "16:00")
   - Only use these parameters when user EXPLICITLY states specific times
4. get_calendar_events - View their calendar to check availability and existing commitments
5. update_task_status - Mark tasks as completed, in progress, pending, or skipped
6. reschedule_task - Move a SINGLE EXISTING task to a different time slot (NOT for creating new tasks)
7. get_user_assignments - Retrieve all assignments with status and details

CRITICAL - Handling Rescheduling:
- When a user asks to reschedule, use reschedule_task to MOVE the existing task
- DO NOT create a new assignment/task when rescheduling - that creates duplicates
- If schedule_tasks already created events and user wants changes, explain they can manually move
  events in their Google Calendar, or you can help them reschedule specific tasks

Workflow When Student Describes an Assignment:
1. Gather Information: Ask about scope, requirements, familiarity with topic, and any special considerations

2. Create Assignment: Call create_assignment ONCE with complete details including difficulty level

3. THINK & Analyze: Use your thinking mode to deeply analyze the assignment
   Think through:
   - What type of work is this really? (Don't just pattern-match to templates)
   - What are the actual phases needed for THIS specific assignment?
   - How does the student's familiarity level affect the approach?
   - What's a realistic time estimate for each phase given the scope?
   - Are there any unique challenges or requirements to account for?
   - What's the most logical sequence of work?

4. Create Subtasks: After thorough thinking, call create_subtasks ONCE with your analyzed breakdown
   IMPORTANT: Only call create_subtasks ONE TIME per assignment. Do not create subtasks multiple times.
   Example format:
   {{
     "assignment_id": "abc123",
     "subtasks": [
       {{
         "title": "Research topic and gather sources",
         "description": "Find 5-7 academic sources on the topic",
         "phase": "Research",
         "estimated_duration": 120
       }},
       {{
         "title": "Create outline",
         "description": "Organize main points and structure",
         "phase": "Planning",
         "estimated_duration": 45
       }}
     ]
   }}
5. Explain: Share your breakdown and reasoning behind time estimates
6. Schedule (if requested): Check their calendar and schedule tasks using their preferences
7. Confirm: Verify the plan works for them and offer to make adjustments

Time Estimation Approach - USE THINKING MODE:
THINK through time estimates carefully - don't use fixed formulas or patterns.

For each subtask, think through:
1. What exactly needs to be done in this step?
2. How long would this realistically take for THIS student?
   - Account for their difficulty level (easy/medium/hard)
   - Consider if they're familiar with the topic or learning from scratch
3. What could slow them down? (complex material, need for breaks, distractions)
4. Should I add buffer time? (usually 20-30% is reasonable)

Think through concrete examples:
- Reading 50 pages of dense philosophy: Think about comprehension speed, note-taking, re-reading
- Writing a 5-page essay: Think about research time, drafting speed, revision rounds
- Solving 20 calculus problems: Think about problem difficulty, getting stuck, checking work
- Creating a presentation: Think about research, slide design, practice time

Different students work at different paces - use the difficulty level and your reasoning to
estimate realistically for THIS specific student and assignment.

Subtask Phases:
Choose appropriate phase labels that fit the work:
- Research: Finding sources, gathering information, background reading
- Planning: Outlining, organizing thoughts, creating structures
- Drafting: Initial creation of written work
- Execution: Solving problems, building components, primary work
- Practice: Rehearsing, doing practice problems, skill development
- Review: Editing, checking work, refining quality
- Study: Memorization, concept review, exam preparation
- Revision: Incorporating feedback, polishing final product

User Preferences Integration:
The schedule_tasks function automatically respects their settings:
- Only schedules on their available days
- Uses their preferred study time windows
- Prioritizes times matching their productivity pattern
- Finishes work before deadline based on their buffer preference
- Adds extra time for subjects they find challenging

When explaining schedules, acknowledge their preferences naturally:
- "I've arranged this during your morning hours since that's when you study best"
- "I made sure to finish 3 days before the due date"
- "I added some extra time for the math components"

Calendar Sync Behavior:
Google Calendar is the source of truth. The system automatically syncs with their calendar:
- Deleting a SteadyStudy event from Google Calendar removes it from the database
- Editing event times in Google Calendar keeps tasks in sync
- If all subtasks are deleted, the assignment is automatically removed
- This gives students full control through their calendar app

Scheduling - USE THINKING MODE:
Before calling schedule_tasks, THINK through:
- When should each subtask happen based on dependencies and deadlines?
- Are there subtasks that need to be done in sequence vs parallel?
- How does this fit with their other commitments and preferences?
- Would spreading the work out be better, or doing it in focused sessions?
- What's a realistic completion timeline given their schedule?

IMPORTANT - User-Specified Times:
When a user explicitly requests specific times like:
- "Schedule this from 3 to 4"
- "Can you put this at 2pm to 3pm?"
- "I want to work on this from 15:00 to 16:00"

You MUST use the preferred_start_time and preferred_end_time parameters in schedule_tasks:
- Convert their time to 24-hour format: "3pm" → "15:00", "4am" → "04:00"
- Pass both start and end times
- Example: schedule_tasks(assignment_id="xyz", preferred_start_time="15:00", preferred_end_time="16:00")

Without these parameters, the function will use their general preferences instead of the specific times they requested.

IMPORTANT - Checking Conflicts:
- ALWAYS call get_calendar_events FIRST to see their actual schedule
- Look at the actual events returned - don't assume conflicts
- Only claim a conflict exists if you can see an actual overlapping event
- The schedule_tasks function is smart - it will find free time automatically
- If schedule_tasks succeeds, the times it chose ARE available (trust the function)

Best Practices:
- Suggest appropriate session lengths based on task type (deep work vs quick tasks)
- Consider cognitive load (don't schedule intense work back-to-back)
- Respect their existing commitments visible in the calendar
- Offer alternatives if initial schedule doesn't fit their needs
- Celebrate progress and completed tasks

REMEMBER: Use thinking mode extensively. Your thoughtful analysis leads to better plans
that actually work for students. Don't rush - think through each decision carefully.

Be helpful, adaptive, and focused on making academic success achievable and sustainable.
"""

    def __init__(self, gemini_api_key: str):
        """
        Initialize the chat handler with Gemini API.

        Args:
            gemini_api_key: Google Gemini API key
        """
        genai.configure(api_key=gemini_api_key)

        # Format system instruction with current date
        current_date = datetime.now().strftime("%B %d, %Y")  # e.g., "November 08, 2025"
        system_instruction = self.SYSTEM_INSTRUCTION.format(current_date=current_date)

        # Initialize Gemini model with function calling and thinking enabled
        self.model = genai.GenerativeModel(
            model_name='gemini-2.5-flash',  # Model with thinking support
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
        # Convert conversation history to Gemini format
        gemini_history = []
        for msg in conversation_history:
            gemini_history.append({
                "role": msg["role"],
                "parts": [msg["content"]]
            })

        try:
            # Start chat session with history
            chat = self.model.start_chat(history=gemini_history)

            # Send user message
            print(f"\n{'='*60}")
            print(f"Processing user message: {user_message[:100]}...")
            print(f"{'='*60}\n")

            response = chat.send_message(user_message)

            print(f"Gemini response received")
            print(f"Candidates: {len(response.candidates) if hasattr(response, 'candidates') else 0}")

            # Validate response structure
            if not hasattr(response, 'candidates') or len(response.candidates) == 0:
                print(f"ERROR: Invalid response structure - no candidates")
                print(f"Response: {response}")
                return {
                    "message": "I apologize, but I received an unexpected response. Please try again.",
                    "function_calls": [],
                    "error": "invalid_response_structure"
                }

            candidate = response.candidates[0]

            # Check for malformed function calls
            if hasattr(candidate, 'finish_reason'):
                finish_reason = str(candidate.finish_reason)
                print(f"Finish reason: {finish_reason}")
                if 'MALFORMED_FUNCTION_CALL' in finish_reason:
                    print(f"ERROR: Malformed function call detected")
                    print(f"Response: {response}")
                    return {
                        "message": "I apologize, but I encountered an error processing your request. Could you please rephrase or provide more details about what you need help with?",
                        "function_calls": [],
                        "error": "malformed_function_call"
                    }

            # Validate content structure
            if not hasattr(candidate, 'content') or not hasattr(candidate.content, 'parts'):
                print(f"ERROR: Invalid candidate structure - no content or parts")
                print(f"Candidate: {candidate}")
                return {
                    "message": "I apologize, but I received an unexpected response. Please try again.",
                    "function_calls": [],
                    "error": "invalid_candidate_structure"
                }

            function_results = []

            # Track created items to prevent duplicates in this conversation turn
            created_assignments = {}  # title -> assignment_id
            created_subtasks_for = set()  # set of assignment_ids that already have subtasks

            # Handle function calls in a loop (AI might chain multiple calls)
            while candidate.content.parts:
                has_function_call = False

                for part in candidate.content.parts:
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
                        # Update candidate for next iteration
                        if hasattr(response, 'candidates') and len(response.candidates) > 0:
                            candidate = response.candidates[0]

                if not has_function_call:
                    break

            # Extract final text response (filter out thinking blocks if present)
            final_message = ""
            for part in candidate.content.parts:
                if hasattr(part, 'text') and part.text:
                    final_message += part.text

            # If no text message, provide a default
            if not final_message and function_results:
                final_message = "I've completed the requested actions."
            elif not final_message:
                final_message = "I understand. How can I help you with your assignments?"

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
