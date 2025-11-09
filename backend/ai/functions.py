"""
Gemini AI Function Declarations for SteadyStudy

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
                    description="Difficulty level: 'easy', 'medium', or 'hard' based on student's familiarity"
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
        name="create_subtasks",
        description="Create subtasks for an assignment with custom titles, descriptions, phases, and time estimates. Call this after analyzing what steps are needed to complete the assignment.",
        parameters=glm.Schema(
            type=glm.Type.OBJECT,
            properties={
                "assignment_id": glm.Schema(
                    type=glm.Type.STRING,
                    description="The ID of the assignment to create subtasks for"
                ),
                "subtasks": glm.Schema(
                    type=glm.Type.ARRAY,
                    description="Array of subtasks to create",
                    items=glm.Schema(
                        type=glm.Type.OBJECT,
                        properties={
                            "title": glm.Schema(
                                type=glm.Type.STRING,
                                description="Subtask title (e.g., 'Research sources', 'Write introduction')"
                            ),
                            "description": glm.Schema(
                                type=glm.Type.STRING,
                                description="Detailed description of what this subtask involves"
                            ),
                            "phase": glm.Schema(
                                type=glm.Type.STRING,
                                description="Work phase (e.g., 'Research', 'Drafting', 'Review', 'Practice', 'Study')"
                            ),
                            "estimated_duration": glm.Schema(
                                type=glm.Type.INTEGER,
                                description="Estimated time in minutes to complete this subtask"
                            )
                        },
                        required=["title", "description", "phase", "estimated_duration"]
                    )
                )
            },
            required=["assignment_id", "subtasks"]
        )
    ),
    glm.FunctionDeclaration(
        name="schedule_tasks",
        description="Schedule subtasks by finding free time in the user's calendar and creating calendar events. Automatically respects user preferences. If user specifies exact times (e.g., '3 to 4', '2pm to 3pm'), use preferred_start_time and preferred_end_time parameters.",
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
                ),
                "preferred_start_time": glm.Schema(
                    type=glm.Type.STRING,
                    description="When user specifies exact start time (e.g., '3pm', '15:00'), provide in HH:MM 24-hour format. Only use this when user explicitly states a time."
                ),
                "preferred_end_time": glm.Schema(
                    type=glm.Type.STRING,
                    description="When user specifies exact end time (e.g., '4pm', '16:00'), provide in HH:MM 24-hour format. Only use this when user explicitly states a time."
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
                    description="New status: 'completed', 'in_progress', 'pending', or 'skipped'"
                ),
                "actual_duration": glm.Schema(
                    type=glm.Type.INTEGER,
                    description="Actual minutes spent on the task (if completed)"
                )
            },
            required=["task_id", "status"]
        )
    ),
    glm.FunctionDeclaration(
        name="get_calendar_events",
        description="Fetch the user's Google Calendar events for a date range to see their availability and existing commitments",
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
        description="Get a list of all assignments for the user with their current status and details",
        parameters=glm.Schema(
            type=glm.Type.OBJECT,
            properties={
                "status_filter": glm.Schema(
                    type=glm.Type.STRING,
                    description="Filter by status: 'all', 'not_started', 'in_progress', 'completed'"
                )
            }
        )
    )
]

# Wrap in Tool for Gemini API
tools = [glm.Tool(function_declarations=AVAILABLE_FUNCTIONS)]
