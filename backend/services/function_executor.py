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
import google.generativeai as genai
import json


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

        # Configure Gemini for AI-powered breakdown
        gemini_api_key = os.getenv("GEMINI_API_KEY")
        if gemini_api_key:
            genai.configure(api_key=gemini_api_key)
            self.breakdown_model = genai.GenerativeModel(
                model_name='gemini-flash-latest',
                generation_config=genai.GenerationConfig(
                    temperature=0.7,
                    response_mime_type="application/json"
                )
            )
        else:
            self.breakdown_model = None

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
        Intelligently schedule tasks by analyzing existing calendar events.

        Features:
        - Checks Google Calendar for existing events
        - Detects heavy workload periods (multiple classes back-to-back)
        - Adds buffer time after intensive activities
        - Never overlaps with existing events
        - Respects user preferences and productivity patterns

        Args:
            user_id: User ID
            assignment_id: Assignment ID
            start_date: Start date for scheduling
            end_date: End date for scheduling (defaults to assignment due date)

        Returns:
            Dict with intelligently scheduled tasks
        """
        try:
            assignment = await self.db.get_assignment(assignment_id)
            tasks = await self.db.get_assignment_tasks(assignment_id)
            preferences = await self.db.get_user_preferences(user_id)

            if not assignment:
                return {"success": False, "error": "Assignment not found"}

            # Extract user preferences
            study_settings = preferences.get("studySettings", {}) if preferences else {}
            days_available = study_settings.get("daysAvailable", [1, 2, 3, 4, 5])
            productivity_pattern = study_settings.get("productivityPattern", "midday")
            deadline_buffer = study_settings.get("assignmentDeadlineBuffer", 2)
            subject_strengths = study_settings.get("subjectStrengths", [])

            # Get assignment subject and check if it needs more time
            assignment_subject = assignment.get("subject", "")
            needs_more_time = False
            for subject in subject_strengths:
                if subject.get("subject", "").lower() == assignment_subject.lower():
                    needs_more_time = subject.get("needsMoreTime", False)
                    break

            # Calculate scheduling window
            start = datetime.now() if not start_date else parser.parse(start_date)
            if "due_date" in assignment:
                due_date = assignment["due_date"]
                if isinstance(due_date, str):
                    due_date = parser.parse(due_date)
                target_completion = due_date - timedelta(days=deadline_buffer)
            else:
                target_completion = start + timedelta(days=14)

            # STEP 1: Fetch existing calendar events for the entire scheduling window
            print(f"\n{'='*60}")
            print(f"INTELLIGENT SCHEDULING: Fetching calendar events...")
            print(f"Window: {start.date()} to {target_completion.date()}")

            calendar_events_result = await self.get_calendar_events(
                user_id,
                start.isoformat(),
                target_completion.isoformat()
            )

            existing_events = calendar_events_result.get("events", [])
            print(f"Found {len(existing_events)} existing calendar events")

            # STEP 2: Analyze calendar to find truly free time slots
            def parse_event_time(event):
                """Extract start and end times from calendar event."""
                start_str = event.get("start", {}).get("dateTime") or event.get("start", {}).get("date")
                end_str = event.get("end", {}).get("dateTime") or event.get("end", {}).get("date")

                if start_str and end_str:
                    try:
                        return parser.parse(start_str), parser.parse(end_str)
                    except:
                        return None, None
                return None, None

            # Build list of busy periods
            busy_periods = []
            for event in existing_events:
                event_start, event_end = parse_event_time(event)
                if event_start and event_end:
                    busy_periods.append({
                        "start": event_start,
                        "end": event_end,
                        "title": event.get("summary", "Busy"),
                        "is_study_autopilot": event.get("extendedProperties", {}).get("private", {}).get("studyAutopilot") == "true"
                    })

            # Sort busy periods by start time
            busy_periods.sort(key=lambda x: x["start"])
            print(f"Identified {len(busy_periods)} busy time periods")

            def is_heavy_workload_period(check_time):
                """
                Detect if a time period has heavy workload (multiple events back-to-back).
                Returns (is_heavy, buffer_needed_minutes)
                """
                # Look at 3-hour window before the check time
                window_start = check_time - timedelta(hours=3)
                window_end = check_time

                events_in_window = [
                    bp for bp in busy_periods
                    if not bp["is_study_autopilot"]  # Don't count our own tasks
                    and bp["start"] < window_end
                    and bp["end"] > window_start
                ]

                if len(events_in_window) >= 3:
                    # 3+ events in 3 hours = heavy workload
                    return True, 60  # Need 60 min buffer
                elif len(events_in_window) == 2:
                    # 2 events = moderate workload
                    return True, 30  # Need 30 min buffer

                return False, 0

            def find_free_slot(duration_minutes, search_start_time, preferred_time_ranges):
                """
                Find the next free time slot that:
                - Doesn't overlap with existing events
                - Has appropriate buffer after heavy workloads
                - Falls within preferred time ranges
                - Respects available days
                """
                current_search = search_start_time
                max_days_ahead = 30
                days_checked = 0

                while days_checked < max_days_ahead:
                    # Check if this day is available
                    day_of_week = current_search.weekday()
                    day_num = (day_of_week + 1) % 7

                    if day_num not in days_available:
                        current_search += timedelta(days=1)
                        current_search = current_search.replace(hour=8, minute=0, second=0, microsecond=0)
                        days_checked += 1
                        continue

                    # Try each preferred time range for this day
                    for time_range in preferred_time_ranges:
                        start_time_str = time_range.get("start", "09:00")
                        end_time_str = time_range.get("end", "17:00")

                        hour, minute = map(int, start_time_str.split(":"))
                        range_start = current_search.replace(hour=hour, minute=minute, second=0, microsecond=0)

                        hour, minute = map(int, end_time_str.split(":"))
                        range_end = current_search.replace(hour=hour, minute=minute, second=0, microsecond=0)

                        # Start from the beginning of the range or current search time, whichever is later
                        slot_start = max(range_start, current_search)

                        # Try to find a slot within this time range
                        while slot_start + timedelta(minutes=duration_minutes) <= range_end:
                            slot_end = slot_start + timedelta(minutes=duration_minutes)

                            # Check for overlaps with existing events
                            has_overlap = False
                            for busy in busy_periods:
                                if (slot_start < busy["end"] and slot_end > busy["start"]):
                                    has_overlap = True
                                    # Jump to after this busy period
                                    slot_start = busy["end"]
                                    break

                            if has_overlap:
                                continue

                            # Check if this time is after a heavy workload period
                            is_heavy, buffer_needed = is_heavy_workload_period(slot_start)
                            if is_heavy:
                                # Add buffer time
                                slot_start_with_buffer = slot_start + timedelta(minutes=buffer_needed)
                                if slot_start_with_buffer + timedelta(minutes=duration_minutes) <= range_end:
                                    slot_start = slot_start_with_buffer
                                    slot_end = slot_start + timedelta(minutes=duration_minutes)
                                else:
                                    # Not enough time left in range with buffer
                                    break

                            # Found a good slot!
                            return slot_start, slot_end

                            # If we get here, move forward and try again
                            slot_start += timedelta(minutes=15)  # Try every 15 minutes

                    # No slot found today, try tomorrow
                    current_search += timedelta(days=1)
                    current_search = current_search.replace(hour=8, minute=0, second=0, microsecond=0)
                    days_checked += 1

                # Couldn't find a slot
                return None, None

            # Define preferred time ranges based on productivity pattern
            time_ranges_map = {
                "morning": [{"start": "08:00", "end": "12:00"}],
                "midday": [{"start": "10:00", "end": "17:00"}],
                "evening": [{"start": "17:00", "end": "21:00"}],
                "all_day": [
                    {"start": "08:00", "end": "12:00"},
                    {"start": "13:00", "end": "17:00"},
                    {"start": "18:00", "end": "21:00"}
                ]
            }

            preferred_time_ranges = time_ranges_map.get(productivity_pattern, time_ranges_map["midday"])

            # STEP 3: Schedule each task intelligently
            scheduled_tasks = []
            current_search_time = start

            print(f"\nScheduling {len(tasks)} tasks intelligently...")

            for i, task in enumerate(tasks):
                duration_minutes = task["estimated_duration"]

                # Apply time multiplier if subject needs more time
                if needs_more_time:
                    duration_minutes = int(duration_minutes * 1.25)

                print(f"\nTask {i+1}/{len(tasks)}: {task['title']} ({duration_minutes} min)")

                # Find optimal free slot
                slot_start, slot_end = find_free_slot(
                    duration_minutes,
                    current_search_time,
                    preferred_time_ranges
                )

                if slot_start and slot_end:
                    print(f"  ✓ Scheduled: {slot_start.strftime('%a %b %d, %I:%M %p')} - {slot_end.strftime('%I:%M %p')}")

                    scheduled_tasks.append({
                        "task_id": str(task["_id"]),
                        "title": task["title"],
                        "scheduled_start": slot_start.isoformat(),
                        "scheduled_end": slot_end.isoformat(),
                        "duration_minutes": duration_minutes,
                        "description": task.get("description", "")
                    })

                    # Add this to busy periods so next task doesn't overlap
                    busy_periods.append({
                        "start": slot_start,
                        "end": slot_end,
                        "title": task["title"],
                        "is_study_autopilot": True
                    })
                    busy_periods.sort(key=lambda x: x["start"])

                    # Next search starts after this task
                    current_search_time = slot_end
                else:
                    print(f"  ✗ WARNING: Could not find suitable slot for {task['title']}")
                    # Fallback: schedule at next available morning slot
                    fallback_start = current_search_time.replace(hour=9, minute=0)
                    fallback_end = fallback_start + timedelta(minutes=duration_minutes)
                    scheduled_tasks.append({
                        "task_id": str(task["_id"]),
                        "title": task["title"],
                        "scheduled_start": fallback_start.isoformat(),
                        "scheduled_end": fallback_end.isoformat(),
                        "duration_minutes": duration_minutes,
                        "description": task.get("description", "")
                    })
                    current_search_time = fallback_end

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
