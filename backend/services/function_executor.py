"""
Function Executor Service

Executes function calls from Gemini AI to manipulate assignments,
tasks, and calendar events.
"""

from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from dateutil import parser
import httpx
import os


class FunctionExecutor:
    """
    Executes AI function calls and interacts with database and external APIs.
    """

    def __init__(self, db, user_id: str, auth_token: Optional[str] = None):
        """
        Initialize function executor.

        Args:
            db: Database connection instance
            user_id: User ID for operations
            auth_token: Optional JWT token for API calls
        """
        self.db = db
        self.user_id = user_id
        self.auth_token = auth_token
        self.api_base_url = os.getenv("API_BASE_URL", "http://localhost:3000")

    async def create_assignment(
        self,
        user_id: str,
        args: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create a new assignment.

        Args:
            user_id: User ID
            args: Assignment data (title, description, due_date, difficulty, subject)

        Returns:
            Dict with assignment_id and success status
        """
        try:
            # Parse due date
            due_date = parser.parse(args["due_date"])

            assignment_data = {
                "title": args["title"],
                "description": args.get("description", ""),
                "due_date": due_date,
                "difficulty_level": args.get("difficulty", "medium"),
                "subject": args.get("subject", "General"),
                "total_estimated_hours": 0,  # Will be calculated after breakdown
            }

            assignment_id = await self.db.create_assignment(user_id, assignment_data)

            return {
                "success": True,
                "assignment_id": assignment_id,
                "message": f"Created assignment: {args['title']}"
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def break_down_assignment(
        self,
        assignment_id: str,
        user_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Break down an assignment into subtasks.

        This is a simplified version. In production, you might use another
        AI call or more sophisticated logic.

        Args:
            assignment_id: Assignment ID
            user_context: Optional user preferences

        Returns:
            Dict with subtasks and total estimated hours
        """
        try:
            assignment = await self.db.get_assignment(assignment_id)

            if not assignment:
                return {"success": False, "error": "Assignment not found"}

            # Simple heuristic-based breakdown
            # In production, this could be another Gemini API call
            title = assignment["title"].lower()
            difficulty = assignment.get("difficulty_level", "medium")

            # Difficulty multipliers
            multipliers = {"easy": 0.7, "medium": 1.0, "hard": 1.5}
            mult = multipliers.get(difficulty, 1.0)

            # Estimate total hours based on assignment type
            total_hours = 10 * mult  # Default

            if "paper" in title or "essay" in title or "report" in title:
                # Research paper breakdown
                subtasks = [
                    {
                        "title": "Research and collect sources",
                        "description": "Find and read credible sources for the paper",
                        "phase": "Research",
                        "estimated_duration": int(180 * mult),  # 3 hours in minutes
                        "order_index": 0
                    },
                    {
                        "title": "Create outline and thesis",
                        "description": "Develop paper structure and main argument",
                        "phase": "Research",
                        "estimated_duration": int(60 * mult),  # 1 hour
                        "order_index": 1
                    },
                    {
                        "title": "Write first draft",
                        "description": "Complete first full draft of the paper",
                        "phase": "Drafting",
                        "estimated_duration": int(240 * mult),  # 4 hours
                        "order_index": 2
                    },
                    {
                        "title": "Revise and edit",
                        "description": "Review, edit, and polish the paper",
                        "phase": "Revision",
                        "estimated_duration": int(120 * mult),  # 2 hours
                        "order_index": 3
                    },
                    {
                        "title": "Final formatting and citations",
                        "description": "Format paper and check all citations",
                        "phase": "Revision",
                        "estimated_duration": int(60 * mult),  # 1 hour
                        "order_index": 4
                    }
                ]
                total_hours = sum(t["estimated_duration"] for t in subtasks) / 60

            elif "problem" in title or "homework" in title or "pset" in title:
                # Problem set breakdown
                subtasks = [
                    {
                        "title": "Review relevant concepts",
                        "description": "Review course materials and notes",
                        "phase": "Preparation",
                        "estimated_duration": int(45 * mult),
                        "order_index": 0
                    },
                    {
                        "title": "Solve problems",
                        "description": "Work through all problem set questions",
                        "phase": "Execution",
                        "estimated_duration": int(120 * mult),  # 2 hours
                        "order_index": 1
                    },
                    {
                        "title": "Review and check work",
                        "description": "Double-check solutions and formatting",
                        "phase": "Review",
                        "estimated_duration": int(45 * mult),
                        "order_index": 2
                    }
                ]
                total_hours = sum(t["estimated_duration"] for t in subtasks) / 60

            else:
                # Generic breakdown
                subtasks = [
                    {
                        "title": "Understand requirements",
                        "description": "Review assignment instructions thoroughly",
                        "phase": "Planning",
                        "estimated_duration": int(30 * mult),
                        "order_index": 0
                    },
                    {
                        "title": "Complete main work",
                        "description": "Work on the assignment",
                        "phase": "Execution",
                        "estimated_duration": int(180 * mult),  # 3 hours
                        "order_index": 1
                    },
                    {
                        "title": "Review and finalize",
                        "description": "Final review and submission prep",
                        "phase": "Review",
                        "estimated_duration": int(60 * mult),
                        "order_index": 2
                    }
                ]
                total_hours = sum(t["estimated_duration"] for t in subtasks) / 60

            # Create subtasks in database
            task_ids = []
            for subtask in subtasks:
                task_id = await self.db.create_task(
                    self.user_id,
                    assignment_id,
                    subtask
                )
                task_ids.append(task_id)

            # Update assignment with total hours
            await self.db.update_assignment(
                assignment_id,
                {"total_estimated_hours": total_hours}
            )

            return {
                "success": True,
                "subtasks": subtasks,
                "total_hours": total_hours,
                "task_ids": task_ids,
                "message": f"Created {len(subtasks)} subtasks totaling {total_hours:.1f} hours"
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def schedule_tasks(
        self,
        user_id: str,
        assignment_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Schedule tasks for an assignment using user preferences.

        Args:
            user_id: User ID
            assignment_id: Assignment ID
            start_date: Start date for scheduling
            end_date: End date for scheduling (defaults to assignment due date)

        Returns:
            Dict with scheduled tasks
        """
        try:
            assignment = await self.db.get_assignment(assignment_id)
            tasks = await self.db.get_assignment_tasks(assignment_id)
            preferences = await self.db.get_user_preferences(user_id)

            if not assignment:
                return {"success": False, "error": "Assignment not found"}

            # Extract user preferences or use defaults
            study_settings = preferences.get("studySettings", {}) if preferences else {}
            days_available = study_settings.get("daysAvailable", [1, 2, 3, 4, 5])  # Mon-Fri
            preferred_times = study_settings.get("preferredStudyTimes", [])
            productivity_pattern = study_settings.get("productivityPattern", "midday")
            deadline_buffer = study_settings.get("assignmentDeadlineBuffer", 2)
            subject_strengths = study_settings.get("subjectStrengths", [])
            default_work_duration = study_settings.get("defaultWorkDuration", 50)

            # Get assignment subject and check if it needs more time
            assignment_subject = assignment.get("subject", "")
            needs_more_time = False
            for subject in subject_strengths:
                if subject.get("subject", "").lower() == assignment_subject.lower():
                    needs_more_time = subject.get("needsMoreTime", False)
                    break

            # Define time ranges based on productivity pattern
            time_ranges = {
                "morning": {"start": "08:00", "end": "12:00"},
                "midday": {"start": "12:00", "end": "17:00"},
                "evening": {"start": "17:00", "end": "21:00"}
            }

            # Use preferred times if available, otherwise use productivity pattern
            if preferred_times:
                available_time_blocks = preferred_times
            else:
                pattern_range = time_ranges.get(productivity_pattern, time_ranges["midday"])
                available_time_blocks = [pattern_range]

            # Calculate start date (today or provided)
            start = datetime.now() if not start_date else parser.parse(start_date)

            # Calculate end date (assignment due date minus buffer)
            if "due_date" in assignment:
                due_date = assignment["due_date"]
                if isinstance(due_date, str):
                    due_date = parser.parse(due_date)
                # Apply deadline buffer
                target_completion = due_date - timedelta(days=deadline_buffer)
            else:
                target_completion = start + timedelta(days=14)  # Default 2 weeks

            # Schedule tasks
            scheduled_tasks = []
            current_date = start.replace(hour=0, minute=0, second=0, microsecond=0)

            for task in tasks:
                duration_minutes = task["estimated_duration"]

                # Apply time multiplier if subject needs more time
                if needs_more_time:
                    duration_minutes = int(duration_minutes * 1.25)  # 25% more time

                # Find next available slot
                scheduled = False
                attempts = 0
                max_attempts = 30  # Prevent infinite loop

                while not scheduled and attempts < max_attempts and current_date <= target_completion:
                    # Check if current day is available
                    day_of_week = current_date.weekday()  # Monday=0, Sunday=6

                    # Convert to 0=Sunday format if needed
                    day_num = (day_of_week + 1) % 7

                    if day_num in days_available:
                        # Try to schedule in the first available time block
                        for time_block in available_time_blocks:
                            start_time_str = time_block["start"]
                            hour, minute = map(int, start_time_str.split(":"))

                            task_start = current_date.replace(hour=hour, minute=minute)
                            task_end = task_start + timedelta(minutes=duration_minutes)

                            # Make sure we don't exceed the time block end
                            block_end_str = time_block["end"]
                            block_hour, block_minute = map(int, block_end_str.split(":"))
                            block_end = current_date.replace(hour=block_hour, minute=block_minute)

                            if task_end <= block_end:
                                scheduled_tasks.append({
                                    "task_id": str(task["_id"]),
                                    "title": task["title"],
                                    "scheduled_start": task_start.isoformat(),
                                    "scheduled_end": task_end.isoformat(),
                                    "duration_minutes": duration_minutes,
                                    "description": task.get("description", "")
                                })
                                scheduled = True
                                # Move to next available time or day
                                current_date = task_end.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
                                break

                    if not scheduled:
                        current_date += timedelta(days=1)
                        attempts += 1

                if not scheduled:
                    # Fallback: schedule anyway with warning
                    task_start = current_date.replace(hour=10, minute=0)
                    task_end = task_start + timedelta(minutes=duration_minutes)
                    scheduled_tasks.append({
                        "task_id": str(task["_id"]),
                        "title": task["title"],
                        "scheduled_start": task_start.isoformat(),
                        "scheduled_end": task_end.isoformat(),
                        "duration_minutes": duration_minutes,
                        "description": task.get("description", "")
                    })
                    current_date += timedelta(days=1)

            # Call Next.js API to create Google Calendar events
            calendar_result = None
            calendar_error = None

            if not self.auth_token:
                print("WARNING: No auth token available, cannot create calendar events")
                return {
                    "success": False,
                    "error": "No authentication token available. Cannot create calendar events.",
                    "scheduled_tasks": scheduled_tasks,
                    "calendar_events": []
                }

            try:
                print(f"\n{'='*60}")
                print(f"DEBUG: Calling calendar API to create events")
                print(f"DEBUG: API URL: {self.api_base_url}/api/calendar/create-events")
                print(f"DEBUG: Number of tasks: {len(scheduled_tasks)}")
                print(f"DEBUG: Auth token present: {bool(self.auth_token)}")

                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        f"{self.api_base_url}/api/calendar/create-events",
                        json={"tasks": scheduled_tasks},
                        headers={"Authorization": f"Bearer {self.auth_token}"},
                        timeout=30.0
                    )

                    print(f"DEBUG: Calendar API response status: {response.status_code}")
                    print(f"DEBUG: Calendar API response body: {response.text}")

                    if response.status_code == 200:
                        calendar_result = response.json()
                        created_count = len(calendar_result.get("created_events", []))
                        error_count = len(calendar_result.get("errors", []))

                        print(f"DEBUG: Successfully created {created_count} events")
                        if error_count > 0:
                            print(f"WARNING: {error_count} events failed to create")
                            print(f"WARNING: Errors: {calendar_result.get('errors')}")

                        print(f"{'='*60}\n")

                        # Return success only if at least one event was created
                        if created_count > 0:
                            return {
                                "success": True,
                                "scheduled_tasks": scheduled_tasks,
                                "calendar_events": calendar_result.get("created_events", []),
                                "errors": calendar_result.get("errors", []),
                                "message": f"Scheduled {len(scheduled_tasks)} tasks and successfully created {created_count} calendar events" +
                                          (f" ({error_count} failed)" if error_count > 0 else "")
                            }
                        else:
                            return {
                                "success": False,
                                "error": f"Failed to create any calendar events. Errors: {calendar_result.get('errors', [])}",
                                "scheduled_tasks": scheduled_tasks,
                                "calendar_events": []
                            }
                    else:
                        error_msg = f"Calendar API returned status {response.status_code}: {response.text}"
                        print(f"ERROR: {error_msg}")
                        print(f"{'='*60}\n")
                        return {
                            "success": False,
                            "error": error_msg,
                            "scheduled_tasks": scheduled_tasks,
                            "calendar_events": []
                        }
            except Exception as e:
                error_msg = f"Failed to create calendar events: {type(e).__name__}: {str(e)}"
                print(f"ERROR: {error_msg}")
                import traceback
                traceback.print_exc()
                print(f"{'='*60}\n")
                return {
                    "success": False,
                    "error": error_msg,
                    "scheduled_tasks": scheduled_tasks,
                    "calendar_events": []
                }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def update_task_status(
        self,
        user_id: str,
        task_id: str,
        status: str,
        actual_duration: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Update task status.

        Args:
            user_id: User ID
            task_id: Task ID
            status: New status
            actual_duration: Actual time spent in minutes

        Returns:
            Dict with success status
        """
        try:
            updates = {"status": status}

            if status == "completed":
                updates["completed_at"] = datetime.utcnow()
                if actual_duration:
                    updates["actual_duration"] = actual_duration

            await self.db.update_task(task_id, updates)

            return {
                "success": True,
                "message": f"Task marked as {status}"
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def get_calendar_events(
        self,
        user_id: str,
        start_date: str,
        end_date: str
    ) -> Dict[str, Any]:
        """
        Get calendar events from Google Calendar.

        Args:
            user_id: User ID
            start_date: Start date (ISO format)
            end_date: End date (ISO format)

        Returns:
            Dict with calendar events
        """
        print(f"\n{'='*60}")
        print(f"DEBUG: get_calendar_events called")
        print(f"DEBUG: User ID: {user_id}")
        print(f"DEBUG: Start date: {start_date}")
        print(f"DEBUG: End date: {end_date}")
        print(f"DEBUG: Auth token present: {bool(self.auth_token)}")
        print(f"{'='*60}\n")

        if not self.auth_token:
            print("ERROR: No auth token available")
            return {
                "success": False,
                "events": [],
                "message": "No authentication token available"
            }

        try:
            url = f"{self.api_base_url}/api/calendar/events"
            params = {"start_date": start_date, "end_date": end_date}

            print(f"DEBUG: Calling calendar events API")
            print(f"DEBUG: URL: {url}")
            print(f"DEBUG: Params: {params}")

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    params=params,
                    headers={"Authorization": f"Bearer {self.auth_token}"},
                    timeout=30.0
                )

                print(f"DEBUG: Response status: {response.status_code}")
                print(f"DEBUG: Response body: {response.text}")

                if response.status_code == 200:
                    data = response.json()
                    events = data.get("events", [])
                    print(f"DEBUG: Successfully fetched {len(events)} events")
                    for i, event in enumerate(events):
                        print(f"DEBUG: Event {i+1}: {event.get('title')} - {event.get('start')}")
                    return {
                        "success": True,
                        "events": events,
                        "message": f"Found {len(events)} events"
                    }
                else:
                    print(f"ERROR: Calendar API returned {response.status_code}")
                    return {
                        "success": False,
                        "events": [],
                        "message": f"Calendar API error: {response.status_code}"
                    }
        except Exception as e:
            print(f"ERROR: Failed to fetch calendar events: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "events": [],
                "message": str(e)
            }

    async def reschedule_task(
        self,
        user_id: str,
        task_id: str,
        new_start: str,
        new_end: str
    ) -> Dict[str, Any]:
        """
        Reschedule a task.

        Args:
            user_id: User ID
            task_id: Task ID
            new_start: New start time
            new_end: New end time

        Returns:
            Dict with success status
        """
        try:
            updates = {
                "scheduled_start": parser.parse(new_start),
                "scheduled_end": parser.parse(new_end)
            }

            await self.db.update_task(task_id, updates)

            return {
                "success": True,
                "message": "Task rescheduled successfully"
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def get_user_assignments(
        self,
        user_id: str,
        status_filter: str = "all"
    ) -> Dict[str, Any]:
        """
        Get all assignments for a user.

        Args:
            user_id: User ID
            status_filter: Filter by status

        Returns:
            Dict with assignments list
        """
        try:
            assignments = await self.db.get_user_assignments(user_id, status_filter)

            return {
                "success": True,
                "assignments": assignments,
                "count": len(assignments)
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
