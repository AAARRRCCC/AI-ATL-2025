"""
Gemini AI Function Declarations for Study Autopilot

This module defines the function calling schema for Google Gemini API.
The AI can call these functions to manipulate assignments, tasks, and calendar events.
"""

import google.ai.generativelanguage as glm

# Function declarations for Gemini (using glm.FunctionDeclaration)
AVAILABLE_FUNCTIONS = [
    glm.FunctionDeclaration(
        name="create_assignment",
        description="Create a new assignment with a title, description, and due date",
        parameters=glm.Schema(
            type=glm.Type.OBJECT,
            properties={
                "title": glm.Schema(
                    type=glm.Type.STRING,
                    description="Assignment title"
                ),
                "description": glm.Schema(
                    type=glm.Type.STRING,
                    description="Assignment details and requirements"
                ),
                "due_date": glm.Schema(
                    type=glm.Type.STRING,
                    description="Due date in ISO format (YYYY-MM-DD)"
                ),
                "difficulty": glm.Schema(
                    type=glm.Type.STRING,
                    description="Difficulty level based on student's familiarity"
                ),
                "subject": glm.Schema(
                    type=glm.Type.STRING,
                    description="Subject or category (e.g., 'Computer Science', 'History')"
                )
            },
            required=["title", "due_date"]
        )
    ),
    glm.FunctionDeclaration(
        name="break_down_assignment",
        description="Analyze an assignment and break it into subtasks with time estimates",
        parameters=glm.Schema(
            type=glm.Type.OBJECT,
            properties={
                "assignment_id": glm.Schema(
                    type=glm.Type.STRING,
                    description="The ID of the assignment to break down"
                )
            },
            required=["assignment_id"]
        )
    ),
    glm.FunctionDeclaration(
        name="schedule_tasks",
        description="Schedule subtasks by finding free time in the user's calendar",
        parameters=glm.Schema(
            type=glm.Type.OBJECT,
            properties={
                "assignment_id": glm.Schema(
                    type=glm.Type.STRING,
                    description="The assignment whose tasks should be scheduled"
                ),
                "start_date": glm.Schema(
                    type=glm.Type.STRING,
                    description="Start date for scheduling (YYYY-MM-DD), defaults to today"
                ),
                "end_date": glm.Schema(
                    type=glm.Type.STRING,
                    description="End date for scheduling (YYYY-MM-DD), defaults to due date"
                )
            },
            required=["assignment_id"]
        )
    ),
    glm.FunctionDeclaration(
        name="update_task_status",
        description="Mark a task as completed, in progress, or skipped",
        parameters=glm.Schema(
            type=glm.Type.OBJECT,
            properties={
                "task_id": glm.Schema(
                    type=glm.Type.STRING,
                    description="The ID of the task to update"
                ),
                "status": glm.Schema(
                    type=glm.Type.STRING,
                    description="New status for the task"
                ),
                "actual_duration": glm.Schema(
                    type=glm.Type.NUMBER,
                    description="Actual minutes spent on the task (if completed)"
                )
            },
            required=["task_id", "status"]
        )
    ),
    glm.FunctionDeclaration(
        name="get_calendar_events",
        description="Fetch the user's Google Calendar events for a date range to see their availability",
        parameters=glm.Schema(
            type=glm.Type.OBJECT,
            properties={
                "start_date": glm.Schema(
                    type=glm.Type.STRING,
                    description="Start datetime in ISO format (YYYY-MM-DDTHH:MM:SS)"
                ),
                "end_date": glm.Schema(
                    type=glm.Type.STRING,
                    description="End datetime in ISO format (YYYY-MM-DDTHH:MM:SS)"
                )
            },
            required=["start_date", "end_date"]
        )
    ),
    glm.FunctionDeclaration(
        name="reschedule_task",
        description="Move a task to a different time slot in the calendar",
        parameters=glm.Schema(
            type=glm.Type.OBJECT,
            properties={
                "task_id": glm.Schema(
                    type=glm.Type.STRING,
                    description="The ID of the task to reschedule"
                ),
                "new_start": glm.Schema(
                    type=glm.Type.STRING,
                    description="New start time in ISO format (YYYY-MM-DDTHH:MM:SS)"
                ),
                "new_end": glm.Schema(
                    type=glm.Type.STRING,
                    description="New end time in ISO format (YYYY-MM-DDTHH:MM:SS)"
                )
            },
            required=["task_id", "new_start", "new_end"]
        )
    ),
    glm.FunctionDeclaration(
        name="get_user_assignments",
        description="Get a list of all assignments for the user with their current status",
        parameters=glm.Schema(
            type=glm.Type.OBJECT,
            properties={
                "status_filter": glm.Schema(
                    type=glm.Type.STRING,
                    description="Filter by status (optional)"
                )
            }
        )
    )
]

# Wrap in Tool for Gemini API
tools = [glm.Tool(function_declarations=AVAILABLE_FUNCTIONS)]
