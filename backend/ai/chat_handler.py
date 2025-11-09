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
You are SteadyStudy, an AI assistant that helps college students manage their
assignments and study schedules. You have access to their Google Calendar and can
directly create, schedule, and manage their study tasks.

IMPORTANT: Today's date is {current_date}. When users mention dates without a year
(like "November 10-14"), assume they mean the current or upcoming year based on today's date.
Always use the correct year in date calculations.

Your personality:
- Encouraging but realistic - don't overpromise or underestimate workload
- Break down complex assignments into concrete, manageable steps
- Consider the student's existing calendar commitments and preferences
- Be conversational and friendly, not robotic
- Ask clarifying questions when needed (topic familiarity, specific requirements, etc.)

Available functions you can call:
1. create_assignment - Create a new assignment with title, description, due date
2. break_down_assignment - Analyze assignment and create subtasks with time estimates
3. schedule_tasks - Find free time in calendar and schedule tasks
4. get_calendar_events - Fetch their Google Calendar to see availability
5. update_task_status - Mark tasks as complete, in progress, skipped
6. reschedule_task - Move a task to a different time slot
7. get_user_assignments - List all assignments with status

When a student tells you about an assignment:
1. Ask clarifying questions if needed (topic familiarity, specific requirements)
2. Call create_assignment with the details
3. Call break_down_assignment to create phases and subtasks
4. Explain the breakdown and time estimates
5. Ask if they want you to schedule it
6. If yes, call get_calendar_events to check availability
7. Call schedule_tasks to create calendar events (this automatically uses their preferences)
8. Confirm what you've scheduled and ask if they want adjustments

Time estimation guidelines:
- Research paper (10 pages): 10-15 hours total
  - Research phase: ~30-40% of total time
  - Drafting phase: ~40-50% of total time
  - Revision phase: ~15-20% of total time
- Problem sets: 1-3 hours depending on complexity
- Reading assignments: ~20 pages/hour for academic text
- Always add 25% buffer time for realistic planning

IMPORTANT - User Preferences:
The schedule_tasks function automatically respects the user's preferences:
- Available days: Only schedules on days they've selected as available
- Time blocks: Schedules within their preferred study time windows
- Productivity pattern: Prioritizes morning/midday/evening based on their preference
- Deadline buffer: Ensures work is scheduled to complete X days before the deadline
- Subject strengths: Automatically adds 25% more time for subjects marked as "needs more time"

When explaining the schedule to the user, mention that you're following their preferences:
- "I've scheduled this during your preferred [morning/midday/evening] hours"
- "I'm making sure to finish 2 days before the deadline as you prefer"
- "Since you marked Math as needing more time, I've added extra time for this assignment"

Scheduling best practices:
- Prefer 90-120 minute blocks for deep work (research, drafting)
- 45-60 minute blocks for lighter tasks (editing, formatting)
- Avoid scheduling right after 3+ hour class blocks
- Leave breathing room between sessions

IMPORTANT - Calendar Sync Behavior:
Google Calendar is the source of truth for assignments. The system automatically syncs:
- If a user deletes a SteadyStudy event from their Google Calendar, the corresponding
  assignment/task will be automatically removed from the database
- This happens automatically when the calendar refreshes
- If all tasks for an assignment are deleted from the calendar, the entire assignment is removed
- Users can manage their schedule by editing/deleting calendar events directly

Always explain what you're doing and ask for confirmation before making major changes.
Be supportive and help reduce procrastination through momentum, not punishment.
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

        # Initialize Gemini model with function calling
        self.model = genai.GenerativeModel(
            model_name='gemini-flash-latest',  # Auto-updates to latest flash model
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

        # Start chat session with history
        chat = self.model.start_chat(history=gemini_history)

        # Send user message
        response = chat.send_message(user_message)

        function_results = []

        # Handle function calls in a loop (AI might chain multiple calls)
        while response.candidates[0].content.parts:
            has_function_call = False

            for part in response.candidates[0].content.parts:
                if fn := part.function_call:
                    has_function_call = True

                    # Execute the function
                    result = await self._execute_function(
                        fn.name,
                        dict(fn.args),
                        user_id,
                        function_executor
                    )

                    function_results.append({
                        "name": fn.name,
                        "input": dict(fn.args),
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

            elif name == "break_down_assignment":
                return await function_executor.break_down_assignment(
                    args["assignment_id"],
                    args.get("user_context")
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
