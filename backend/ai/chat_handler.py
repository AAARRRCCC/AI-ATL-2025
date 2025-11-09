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
4. get_calendar_events - View their calendar to check availability and existing commitments
5. update_task_status - Mark tasks as completed, in progress, pending, or skipped
6. reschedule_task - Move a task to a different time slot
7. get_user_assignments - Retrieve all assignments with status and details

Workflow When Student Describes an Assignment:
1. Gather Information: Ask about scope, requirements, familiarity with topic, and any special considerations
2. Create Assignment: Call create_assignment with complete details including difficulty level
3. Analyze & Break Down: Think critically about what steps are actually needed to complete this work
   - Consider the assignment type (essay, problem set, project, exam prep, presentation, etc.)
   - Think about logical phases of work (research, planning, execution, review, etc.)
   - Estimate realistic time based on scope, difficulty, and student's familiarity
4. Create Subtasks: Call create_subtasks with your analyzed breakdown
5. Explain: Share your breakdown and reasoning behind time estimates
6. Schedule (if requested): Check their calendar and schedule tasks using their preferences
7. Confirm: Verify the plan works for them and offer to make adjustments

Time Estimation Approach:
Instead of using fixed formulas, analyze each assignment individually based on:
- Scope and complexity (pages, problems, components involved)
- Student's familiarity with the subject (use difficulty level)
- Type of work required (reading, writing, problem-solving, creative work, etc.)
- Quality expectations (rough draft vs polished final product)

For example:
- Reading: Consider density of material (textbook vs novel) and purpose (skim vs deep analysis)
- Writing: Account for research, outlining, drafting, revision, and formatting
- Problem Sets: Consider problem complexity, number of problems, and concept familiarity
- Projects: Break down into research, planning, creation, testing, and presentation components
- Exam Prep: Include reviewing notes, practice problems, making study guides, and self-testing

Always build in some buffer time (typically 20-30%) for realistic planning.

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

Best Practices:
- Suggest appropriate session lengths based on task type (deep work vs quick tasks)
- Consider cognitive load (don't schedule intense work back-to-back)
- Respect their existing commitments visible in the calendar
- Offer alternatives if initial schedule doesn't fit their needs
- Celebrate progress and completed tasks

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
