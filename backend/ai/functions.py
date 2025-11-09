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
        description="Create subtasks for an assignment with custom titles, descriptions, phases, time estimates, dependencies, and intensity levels. Call ONCE per assignment after analyzing what steps are needed. IMPORTANT: Create 2-4 substantial work blocks, not 6-8 micro-tasks. Duration estimates will be clamped to user's configured max task duration.",
        parameters=glm.Schema(
            type=glm.Type.OBJECT,
            properties={
                "assignment_id": glm.Schema(
                    type=glm.Type.STRING,
                    description="The ID of the assignment to create subtasks for"
                ),
                "subtasks": glm.Schema(
                    type=glm.Type.ARRAY,
                    description="Array of 2-4 substantial subtasks (not 6-8 micro-tasks). Combine related work into cohesive sessions.",
                    items=glm.Schema(
                        type=glm.Type.OBJECT,
                        properties={
                            "title": glm.Schema(
                                type=glm.Type.STRING,
                                description="Subtask title (e.g., 'Research & Outline', 'Write Draft', 'Revise')"
                            ),
                            "description": glm.Schema(
                                type=glm.Type.STRING,
                                description="Detailed description of what this subtask involves"
                            ),
                            "phase": glm.Schema(
                                type=glm.Type.STRING,
                                description="Work phase: 'Research', 'Planning', 'Drafting', 'Execution', 'Practice', 'Review', 'Study', or 'Revision'"
                            ),
                            "estimated_duration": glm.Schema(
                                type=glm.Type.INTEGER,
                                description="Estimated time in minutes. Be realistic based on actual work required (not templates). Will be clamped to user's max duration setting."
                            ),
                            "depends_on": glm.Schema(
                                type=glm.Type.ARRAY,
                                description="Array of task titles that must be completed before this one (e.g., ['Research sources'] if writing depends on research). Leave empty for tasks with no prerequisites.",
                                items=glm.Schema(type=glm.Type.STRING)
                            ),
                            "intensity": glm.Schema(
                                type=glm.Type.STRING,
                                description="Cognitive intensity: 'light' (review, editing), 'medium' (standard work), or 'intense' (deep learning, complex problems). Used to avoid back-to-back intense sessions."
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
        description="Intelligently schedule subtasks by finding optimal free time slots. AUTOMATICALLY: respects task dependencies (schedules prerequisites first), prioritizes urgent deadlines, adds 15-min buffer breaks between sessions, limits daily study hours, avoids back-to-back intense work, honors user's available days/times, and ensures ZERO overlap with existing calendar events. If user specifies exact times (e.g., '3 to 4', '2pm to 3pm'), use preferred_start_time and preferred_end_time parameters.",
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
                    description="End date for scheduling (YYYY-MM-DD), defaults to assignment due date minus buffer"
                ),
                "preferred_start_time": glm.Schema(
                    type=glm.Type.STRING,
                    description="When user specifies exact start time (e.g., '3pm', '15:00'), provide in HH:MM 24-hour format. Only use this when user explicitly states a time."
                ),
                "preferred_end_time": glm.Schema(
                    type=glm.Type.STRING,
                    description="When user specifies exact end time (e.g., '4pm', '16:00'), provide in HH:MM 24-hour format. Only use this when user explicitly states a time."
                ),
                "proposed_schedule": glm.Schema(
                    type=glm.Type.ARRAY,
                    description="Optional: Your proposed schedule from analyze_scheduling_options. If provided, these exact times will be used (with conflict re-verification). Format: array of {task_id, start, end}",
                    items=glm.Schema(
                        type=glm.Type.OBJECT,
                        properties={
                            "task_id": glm.Schema(
                                type=glm.Type.STRING,
                                description="Task ID to schedule"
                            ),
                            "start": glm.Schema(
                                type=glm.Type.STRING,
                                description="Proposed start datetime (ISO format: YYYY-MM-DDTHH:MM:SS)"
                            ),
                            "end": glm.Schema(
                                type=glm.Type.STRING,
                                description="Proposed end datetime (ISO format: YYYY-MM-DDTHH:MM:SS)"
                            )
                        },
                        required=["task_id", "start", "end"]
                    )
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
        name="get_scheduling_context",
        description="Get comprehensive scheduling context including time range definitions (morning: 08:00-12:00, midday: 12:00-17:00, evening: 17:00-21:00), user preferences, calendar availability, and buffer settings. Use this FIRST when planning schedules to understand constraints.",
        parameters=glm.Schema(
            type=glm.Type.OBJECT,
            properties={
                "date_range_start": glm.Schema(
                    type=glm.Type.STRING,
                    description="Start date for checking availability (YYYY-MM-DD)"
                ),
                "date_range_end": glm.Schema(
                    type=glm.Type.STRING,
                    description="End date for checking availability (YYYY-MM-DD)"
                )
            },
            required=["date_range_start", "date_range_end"]
        )
    ),
    glm.FunctionDeclaration(
        name="analyze_scheduling_options",
        description="Analyze potential time slots for scheduling tasks, considering calendar conflicts, break times, and user preferences/guidelines. Returns scored slot options with reasoning. Use this BEFORE calling schedule_tasks to make informed decisions.",
        parameters=glm.Schema(
            type=glm.Type.OBJECT,
            properties={
                "assignment_id": glm.Schema(
                    type=glm.Type.STRING,
                    description="The assignment whose tasks need scheduling"
                ),
                "date_range_start": glm.Schema(
                    type=glm.Type.STRING,
                    description="Start date for searching slots (YYYY-MM-DD)"
                ),
                "date_range_end": glm.Schema(
                    type=glm.Type.STRING,
                    description="End date for searching slots (YYYY-MM-DD)"
                ),
                "preferred_times": glm.Schema(
                    type=glm.Type.ARRAY,
                    description="Optional: User-specified preferred time windows (higher priority than general preferences)",
                    items=glm.Schema(
                        type=glm.Type.OBJECT,
                        properties={
                            "start": glm.Schema(
                                type=glm.Type.STRING,
                                description="Start time in HH:MM format (24-hour)"
                            ),
                            "end": glm.Schema(
                                type=glm.Type.STRING,
                                description="End time in HH:MM format (24-hour)"
                            )
                        },
                        required=["start", "end"]
                    )
                )
            },
            required=["assignment_id", "date_range_start", "date_range_end"]
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
    ),
    # ═══════════════════════════════════════════════════════════════════════════════
    # PHASE 0: CRITICAL TASK VISIBILITY FUNCTIONS (Enable everything else)
    # ═══════════════════════════════════════════════════════════════════════════════
    glm.FunctionDeclaration(
        name="get_assignment_tasks",
        description="Get all tasks for a specific assignment with their IDs, titles, durations, and status. CRITICAL: Call this FIRST before trying to delete/edit/reference specific tasks. This is how you see task details and get task IDs.",
        parameters=glm.Schema(
            type=glm.Type.OBJECT,
            properties={
                "assignment_id": glm.Schema(
                    type=glm.Type.STRING,
                    description="The assignment whose tasks you want to see"
                )
            },
            required=["assignment_id"]
        )
    ),
    glm.FunctionDeclaration(
        name="find_tasks",
        description="Search for tasks by title, status, or assignment. Use when user references 'the research task' or 'my pending tasks' without specifying exact assignment. Returns tasks with IDs so you can then operate on them.",
        parameters=glm.Schema(
            type=glm.Type.OBJECT,
            properties={
                "query": glm.Schema(
                    type=glm.Type.STRING,
                    description="Search term to match against task titles (case-insensitive partial match, e.g., 'research' matches 'Research sources')"
                ),
                "assignment_id": glm.Schema(
                    type=glm.Type.STRING,
                    description="Optional: Filter to specific assignment. If omitted, searches all assignments."
                ),
                "status": glm.Schema(
                    type=glm.Type.STRING,
                    description="Optional: Filter by status ('pending', 'in_progress', 'completed', 'skipped')"
                )
            },
            required=["query"]
        )
    ),
    # ═══════════════════════════════════════════════════════════════════════════════
    # PHASE 1: DELETE OPERATIONS
    # ═══════════════════════════════════════════════════════════════════════════════
    glm.FunctionDeclaration(
        name="delete_task",
        description="Delete a specific task permanently. Use when user says 'delete this task', 'remove that task', 'I don't need this anymore'. IMPORTANT: Get the task_id first using get_assignment_tasks or find_tasks. Confirm with user if ambiguous.",
        parameters=glm.Schema(
            type=glm.Type.OBJECT,
            properties={
                "task_id": glm.Schema(
                    type=glm.Type.STRING,
                    description="The ID of the task to delete (obtained from get_assignment_tasks or find_tasks)"
                ),
                "reason": glm.Schema(
                    type=glm.Type.STRING,
                    description="Optional: Brief reason for logging (e.g., 'user no longer needs this', 'duplicate task')"
                )
            },
            required=["task_id"]
        )
    ),
    glm.FunctionDeclaration(
        name="delete_assignment",
        description="Delete an entire assignment and ALL its associated tasks permanently. Use when user says 'delete this assignment', 'remove this project', 'cancel this'. WARNING: This is permanent and removes all tasks. Confirm with user before executing.",
        parameters=glm.Schema(
            type=glm.Type.OBJECT,
            properties={
                "assignment_id": glm.Schema(
                    type=glm.Type.STRING,
                    description="The ID of the assignment to delete (obtained from get_user_assignments)"
                )
            },
            required=["assignment_id"]
        )
    ),
    glm.FunctionDeclaration(
        name="delete_tasks_by_assignment",
        description="Delete ALL tasks for an assignment without deleting the assignment itself. Use when user says 'clear all tasks', 'redo the breakdown', 'start over with tasks'. The assignment remains and you can create new subtasks.",
        parameters=glm.Schema(
            type=glm.Type.OBJECT,
            properties={
                "assignment_id": glm.Schema(
                    type=glm.Type.STRING,
                    description="The assignment whose tasks should be deleted"
                )
            },
            required=["assignment_id"]
        )
    ),
    # ═══════════════════════════════════════════════════════════════════════════════
    # PHASE 2: EDIT OPERATIONS
    # ═══════════════════════════════════════════════════════════════════════════════
    glm.FunctionDeclaration(
        name="update_task_properties",
        description="Update task properties like title, description, duration, phase, or intensity. Use when user says 'change the duration to X', 'rename this task', 'make it less intense'. NOTE: For status changes (pending/completed), use update_task_status instead.",
        parameters=glm.Schema(
            type=glm.Type.OBJECT,
            properties={
                "task_id": glm.Schema(
                    type=glm.Type.STRING,
                    description="The ID of the task to update"
                ),
                "title": glm.Schema(
                    type=glm.Type.STRING,
                    description="New task title (optional)"
                ),
                "description": glm.Schema(
                    type=glm.Type.STRING,
                    description="New task description (optional)"
                ),
                "estimated_duration": glm.Schema(
                    type=glm.Type.INTEGER,
                    description="New duration in minutes (optional, will be clamped to user's max task duration)"
                ),
                "phase": glm.Schema(
                    type=glm.Type.STRING,
                    description="New phase (Research, Planning, Execution, Review, etc.) (optional)"
                ),
                "intensity": glm.Schema(
                    type=glm.Type.STRING,
                    description="New intensity level: 'light', 'medium', or 'intense' (optional)"
                )
            },
            required=["task_id"]
        )
    ),
    glm.FunctionDeclaration(
        name="update_assignment_properties",
        description="Update assignment properties like title, description, due date, difficulty, or subject. Use when user says 'move the due date to X', 'change the title', 'make it harder'.",
        parameters=glm.Schema(
            type=glm.Type.OBJECT,
            properties={
                "assignment_id": glm.Schema(
                    type=glm.Type.STRING,
                    description="The ID of the assignment to update"
                ),
                "title": glm.Schema(
                    type=glm.Type.STRING,
                    description="New assignment title (optional)"
                ),
                "description": glm.Schema(
                    type=glm.Type.STRING,
                    description="New description (optional)"
                ),
                "due_date": glm.Schema(
                    type=glm.Type.STRING,
                    description="New due date in ISO format YYYY-MM-DD (optional)"
                ),
                "difficulty": glm.Schema(
                    type=glm.Type.STRING,
                    description="New difficulty: 'easy', 'medium', or 'hard' (optional)"
                ),
                "subject": glm.Schema(
                    type=glm.Type.STRING,
                    description="New subject/category (optional)"
                )
            },
            required=["assignment_id"]
        )
    ),
    # ═══════════════════════════════════════════════════════════════════════════════
    # PHASE 3: ENHANCED QUERY OPERATIONS
    # ═══════════════════════════════════════════════════════════════════════════════
    glm.FunctionDeclaration(
        name="get_tasks_by_status",
        description="Get all tasks for the user filtered by status across ALL assignments. Use when user says 'show my pending tasks', 'what have I completed', 'list incomplete work'. Returns tasks with assignment context.",
        parameters=glm.Schema(
            type=glm.Type.OBJECT,
            properties={
                "status": glm.Schema(
                    type=glm.Type.STRING,
                    description="Task status to filter by: 'pending', 'in_progress', 'completed', or 'skipped'"
                ),
                "limit": glm.Schema(
                    type=glm.Type.INTEGER,
                    description="Optional: Max number of tasks to return (default 50)"
                )
            },
            required=["status"]
        )
    ),
    glm.FunctionDeclaration(
        name="get_upcoming_tasks",
        description="Get tasks scheduled in the next N days, sorted chronologically. Use when user says 'what's coming up', 'show this week's tasks', 'what do I have soon'.",
        parameters=glm.Schema(
            type=glm.Type.OBJECT,
            properties={
                "days_ahead": glm.Schema(
                    type=glm.Type.INTEGER,
                    description="Number of days to look ahead (e.g., 7 for this week, 3 for next few days)"
                )
            },
            required=["days_ahead"]
        )
    ),
    glm.FunctionDeclaration(
        name="get_all_user_tasks",
        description="Get ALL tasks for the user across all assignments, optionally filtered by assignment. Use when user says 'show all my tasks', 'list everything I have to do'. Returns comprehensive task list with assignment context.",
        parameters=glm.Schema(
            type=glm.Type.OBJECT,
            properties={
                "assignment_id": glm.Schema(
                    type=glm.Type.STRING,
                    description="Optional: Filter to specific assignment. If omitted, returns all tasks."
                ),
                "status_filter": glm.Schema(
                    type=glm.Type.STRING,
                    description="Optional: Filter by status ('pending', 'in_progress', 'completed', 'all'). Default is 'all'."
                )
            }
        )
    )
]

# Wrap in Tool for Gemini API
tools = [glm.Tool(function_declarations=AVAILABLE_FUNCTIONS)]
