"""
Gemini AI Function Declarations for Study Autopilot

This module defines the function calling schema for Google Gemini API.
The AI can call these functions to manipulate assignments, tasks, and calendar events.
"""

# Function declarations for Gemini (using dictionary format)
AVAILABLE_FUNCTIONS = [
    {
        "name": "create_assignment",
        "description": "Create a new assignment with a title, description, and due date",
        "parameters": {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "Assignment title"
                },
                "description": {
                    "type": "string",
                    "description": "Assignment details and requirements"
                },
                "due_date": {
                    "type": "string",
                    "description": "Due date in ISO format (YYYY-MM-DD)"
                },
                "difficulty": {
                    "type": "string",
                    "description": "Difficulty level based on student's familiarity",
                    "enum": ["easy", "medium", "hard"]
                },
                "subject": {
                    "type": "string",
                    "description": "Subject or category (e.g., 'Computer Science', 'History')"
                }
            },
            "required": ["title", "due_date"]
        }
    },
    {
        "name": "break_down_assignment",
        "description": "Analyze an assignment and break it into subtasks with time estimates",
        "parameters": {
            "type": "object",
            "properties": {
                "assignment_id": {
                    "type": "string",
                    "description": "The ID of the assignment to break down"
                }
            },
            "required": ["assignment_id"]
        }
    },
    {
        "name": "schedule_tasks",
        "description": "Schedule subtasks by finding free time in the user's calendar",
        "parameters": {
            "type": "object",
            "properties": {
                "assignment_id": {
                    "type": "string",
                    "description": "The assignment whose tasks should be scheduled"
                },
                "start_date": {
                    "type": "string",
                    "description": "Start date for scheduling (YYYY-MM-DD), defaults to today"
                },
                "end_date": {
                    "type": "string",
                    "description": "End date for scheduling (YYYY-MM-DD), defaults to due date"
                }
            },
            "required": ["assignment_id"]
        }
    },
    {
        "name": "update_task_status",
        "description": "Mark a task as completed, in progress, or skipped",
        "parameters": {
            "type": "object",
            "properties": {
                "task_id": {
                    "type": "string",
                    "description": "The ID of the task to update"
                },
                "status": {
                    "type": "string",
                    "description": "New status for the task",
                    "enum": ["pending", "in_progress", "completed", "skipped"]
                },
                "actual_duration": {
                    "type": "number",
                    "description": "Actual minutes spent on the task (if completed)"
                }
            },
            "required": ["task_id", "status"]
        }
    },
    {
        "name": "get_calendar_events",
        "description": "Fetch the user's Google Calendar events for a date range to see their availability",
        "parameters": {
            "type": "object",
            "properties": {
                "start_date": {
                    "type": "string",
                    "description": "Start datetime in ISO format (YYYY-MM-DDTHH:MM:SS)"
                },
                "end_date": {
                    "type": "string",
                    "description": "End datetime in ISO format (YYYY-MM-DDTHH:MM:SS)"
                }
            },
            "required": ["start_date", "end_date"]
        }
    },
    {
        "name": "reschedule_task",
        "description": "Move a task to a different time slot in the calendar",
        "parameters": {
            "type": "object",
            "properties": {
                "task_id": {
                    "type": "string",
                    "description": "The ID of the task to reschedule"
                },
                "new_start": {
                    "type": "string",
                    "description": "New start time in ISO format (YYYY-MM-DDTHH:MM:SS)"
                },
                "new_end": {
                    "type": "string",
                    "description": "New end time in ISO format (YYYY-MM-DDTHH:MM:SS)"
                }
            },
            "required": ["task_id", "new_start", "new_end"]
        }
    },
    {
        "name": "get_user_assignments",
        "description": "Get a list of all assignments for the user with their current status",
        "parameters": {
            "type": "object",
            "properties": {
                "status_filter": {
                    "type": "string",
                    "description": "Filter by status (optional)",
                    "enum": ["all", "not_started", "in_progress", "completed"]
                }
            }
        }
    }
]
