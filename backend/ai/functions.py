"""
Gemini AI Function Declarations for Study Autopilot

This module defines the function calling schema for Google Gemini API.
The AI can call these functions to manipulate assignments, tasks, and calendar events.
"""

import google.generativeai as genai

# Function declarations for Gemini
AVAILABLE_FUNCTIONS = [
    genai.protos.FunctionDeclaration(
        name="create_assignment",
        description="Create a new assignment with a title, description, and due date",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "title": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Assignment title"
                ),
                "description": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Assignment details and requirements"
                ),
                "due_date": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Due date in ISO format (YYYY-MM-DD)"
                ),
                "difficulty": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Difficulty level based on student's familiarity",
                    enum=["easy", "medium", "hard"]
                ),
                "subject": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Subject or category (e.g., 'Computer Science', 'History')"
                )
            },
            required=["title", "due_date"]
        )
    ),

    genai.protos.FunctionDeclaration(
        name="break_down_assignment",
        description="Analyze an assignment and break it into subtasks with time estimates",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "assignment_id": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="The ID of the assignment to break down"
                ),
                "user_context": genai.protos.Schema(
                    type=genai.protos.Type.OBJECT,
                    description="User preferences and constraints (optional)"
                )
            },
            required=["assignment_id"]
        )
    ),

    genai.protos.FunctionDeclaration(
        name="schedule_tasks",
        description="Schedule subtasks by finding free time in the user's calendar",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "assignment_id": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="The assignment whose tasks should be scheduled"
                ),
                "start_date": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Start date for scheduling (YYYY-MM-DD), defaults to today"
                ),
                "end_date": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="End date for scheduling (YYYY-MM-DD), defaults to due date"
                )
            },
            required=["assignment_id"]
        )
    ),

    genai.protos.FunctionDeclaration(
        name="update_task_status",
        description="Mark a task as completed, in progress, or skipped",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "task_id": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="The ID of the task to update"
                ),
                "status": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="New status for the task",
                    enum=["pending", "in_progress", "completed", "skipped"]
                ),
                "actual_duration": genai.protos.Schema(
                    type=genai.protos.Type.NUMBER,
                    description="Actual minutes spent on the task (if completed)"
                )
            },
            required=["task_id", "status"]
        )
    ),

    genai.protos.FunctionDeclaration(
        name="get_calendar_events",
        description="Fetch the user's Google Calendar events for a date range to see their availability",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "start_date": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Start datetime in ISO format (YYYY-MM-DDTHH:MM:SS)"
                ),
                "end_date": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="End datetime in ISO format (YYYY-MM-DDTHH:MM:SS)"
                )
            },
            required=["start_date", "end_date"]
        )
    ),

    genai.protos.FunctionDeclaration(
        name="reschedule_task",
        description="Move a task to a different time slot in the calendar",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "task_id": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="The ID of the task to reschedule"
                ),
                "new_start": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="New start time in ISO format (YYYY-MM-DDTHH:MM:SS)"
                ),
                "new_end": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="New end time in ISO format (YYYY-MM-DDTHH:MM:SS)"
                )
            },
            required=["task_id", "new_start", "new_end"]
        )
    ),

    genai.protos.FunctionDeclaration(
        name="get_user_assignments",
        description="Get a list of all assignments for the user with their current status",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "status_filter": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Filter by status (optional)",
                    enum=["all", "not_started", "in_progress", "completed"]
                )
            }
        )
    )
]

# Create tool with all functions
study_tool = genai.protos.Tool(function_declarations=AVAILABLE_FUNCTIONS)
