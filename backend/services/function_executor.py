"""
Function Executor Service

Executes function calls from Gemini AI to manipulate assignments,
tasks, and calendar events.
"""

from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta, timezone
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

    async def create_subtasks(
        self,
        assignment_id: str,
        subtasks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Create custom subtasks for an assignment as specified by the AI.

        Args:
            assignment_id: Assignment ID
            subtasks: List of subtask definitions from the AI

        Returns:
            Dict with created subtasks and total estimated hours
        """
        try:
            assignment = await self.db.get_assignment(assignment_id)

            if not assignment:
                return {"success": False, "error": "Assignment not found"}

            # Load user preferences to respect max task duration
            preferences = await self.db.get_user_preferences(self.user_id)
            study_settings = preferences.get("studySettings", {}) if preferences else {}

            # Get user's max task duration preference (default 120 minutes for flexibility)
            max_task_duration = study_settings.get("maxTaskDuration", 120)
            min_task_duration = 15  # Minimum 15 minutes for any task

            # Create subtasks in database with order_index
            task_ids = []
            total_minutes = 0
            clamping_applied = []

            for index, subtask in enumerate(subtasks):
                # Add order_index to maintain sequence
                raw_duration = subtask.get("estimated_duration", 60)

                # Respect user's configured max task duration
                clamped_duration = max(min_task_duration, min(raw_duration, max_task_duration))

                # Track if clamping was applied for reporting
                if raw_duration != clamped_duration:
                    clamping_applied.append({
                        "task": subtask["title"],
                        "requested": raw_duration,
                        "clamped_to": clamped_duration
                    })

                # Add dependency and intensity fields if provided
                subtask_data = {
                    "title": subtask["title"],
                    "description": subtask.get("description", ""),
                    "phase": subtask.get("phase", "Work"),
                    "estimated_duration": clamped_duration,
                    "order_index": index,
                    "depends_on": subtask.get("depends_on", []),  # Task dependencies
                    "intensity": subtask.get("intensity", "medium")  # light, medium, intense
                }

                total_minutes += subtask_data["estimated_duration"]

                task_id = await self.db.create_task(
                    self.user_id,
                    assignment_id,
                    subtask_data
                )
                task_ids.append(task_id)

            # Calculate total hours
            total_hours = total_minutes / 60

            # Update assignment with total hours
            await self.db.update_assignment(
                assignment_id,
                {"total_estimated_hours": total_hours}
            )

            result = {
                "success": True,
                "subtasks_created": len(subtasks),
                "total_hours": total_hours,
                "task_ids": task_ids,
                "message": f"Created {len(subtasks)} subtasks totaling {total_hours:.1f} hours"
            }

            # Include clamping warning if durations were adjusted
            if clamping_applied:
                result["clamping_applied"] = clamping_applied
                result["message"] += f" (Note: {len(clamping_applied)} task duration(s) adjusted to respect user's max task duration of {max_task_duration} minutes)"

            return result

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
        end_date: Optional[str] = None,
        preferred_start_time: Optional[str] = None,
        preferred_end_time: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Schedule tasks for an assignment using user preferences.

        Args:
            user_id: User ID
            assignment_id: Assignment ID
            start_date: Start date for scheduling
            end_date: End date for scheduling (defaults to assignment due date)
            preferred_start_time: Optional specific start time (HH:MM format) when user requests exact scheduling
            preferred_end_time: Optional specific end time (HH:MM format) when user requests exact scheduling

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

            # If user specified exact times, override preferences with their specific time window
            if preferred_start_time and preferred_end_time:
                print(f"\n🎯 USER SPECIFIED EXACT TIMES: {preferred_start_time} to {preferred_end_time}")
                preferred_times = [{
                    "start": preferred_start_time,
                    "end": preferred_end_time
                }]

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

            def normalize_datetime(value: Optional[Any]) -> Optional[datetime]:
                if value is None:
                    return None
                dt = value
                if isinstance(value, str):
                    dt = parser.parse(value)
                if isinstance(dt, datetime):
                    if dt.tzinfo:
                        return dt.astimezone(timezone.utc).replace(tzinfo=None)
                    return dt
                return None

            # Calculate start date (today or provided)
            start = datetime.now() if not start_date else normalize_datetime(start_date)
            if start is None:
                start = datetime.now()

            # Calculate end date (assignment due date minus buffer)
            due_date_value = None
            if "due_date" in assignment:
                due_date_value = normalize_datetime(assignment["due_date"])
                # Apply deadline buffer
                target_completion = due_date_value - timedelta(days=deadline_buffer)
            else:
                target_completion = start + timedelta(days=14)  # Default 2 weeks

            if target_completion < start:
                target_completion = start

            # Build busy timeline (existing events + already scheduled tasks)
            busy_intervals: List[tuple[datetime, datetime]] = []

            def add_busy_interval(start_dt_raw: Optional[Any], end_dt_raw: Optional[Any]):
                start_dt = normalize_datetime(start_dt_raw)
                end_dt = normalize_datetime(end_dt_raw)
                if not start_dt or not end_dt:
                    return
                if end_dt <= start_dt:
                    return
                busy_intervals.append((start_dt, end_dt))

            # Existing calendar events
            calendar_window_end = (due_date_value or target_completion) + timedelta(days=1)
            if self.auth_token:
                events_response = await self.get_calendar_events(
                    user_id,
                    start.isoformat(),
                    calendar_window_end.isoformat()
                )
                if events_response.get("success"):
                    for event in events_response.get("events", []):
                        add_busy_interval(
                            event.get("start") or event.get("start_time"),
                            event.get("end") or event.get("end_time")
                        )

            # Existing scheduled tasks
            for task in tasks:
                add_busy_interval(
                    task.get("scheduled_start"),
                    task.get("scheduled_end")
                )

            # ═══════════════════════════════════════════════════════════════
            # SMART SCHEDULING ALGORITHM
            # ═══════════════════════════════════════════════════════════════

            BUFFER_MINUTES = 15  # Break time between study sessions
            max_daily_hours = study_settings.get("maxDailyStudyHours", 6)
            slot_increment = max(15, min(default_work_duration, 45))

            def is_slot_free(start_dt: datetime, end_dt: datetime, with_buffer: bool = True) -> bool:
                """Check if time slot is free, optionally with buffer time."""
                buffer = timedelta(minutes=BUFFER_MINUTES if with_buffer else 0)
                for busy_start, busy_end in busy_intervals:
                    # Add buffer before and after busy slots
                    if start_dt < (busy_end + buffer) and (end_dt + buffer) > busy_start:
                        return False
                return True

            def get_daily_study_minutes(date: datetime) -> int:
                """Calculate total study minutes already scheduled for a given date."""
                day_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
                day_end = day_start + timedelta(days=1)
                total_minutes = 0
                for busy_start, busy_end in busy_intervals:
                    # Only count intervals that look like study sessions (not all-day events)
                    if busy_start >= day_start and busy_end <= day_end:
                        duration = (busy_end - busy_start).total_seconds() / 60
                        if duration <= 180:  # Only count sessions <= 3 hours as study
                            total_minutes += duration
                return int(total_minutes)

            # ═══ Step 1: Build Dependency Graph ═══
            task_by_title = {task["title"]: task for task in tasks}
            dependency_graph = {}  # task_title -> [dependent_task_titles]

            for task in tasks:
                task_title = task["title"]
                depends_on = task.get("depends_on", [])
                if not depends_on:
                    depends_on = []
                dependency_graph[task_title] = depends_on

            # ═══ Step 2: Topological Sort (respect dependencies) ═══
            def topological_sort(graph: Dict[str, List[str]]) -> List[str]:
                """
                Sort tasks so prerequisites come before dependents.
                graph[task] = list of task titles that must be completed before 'task'
                """
                # in_degree[task] = number of prerequisites task has
                in_degree = {}
                for task in graph:
                    # Count how many valid prerequisites this task has
                    in_degree[task] = len([dep for dep in graph[task] if dep in graph])

                # Start with tasks that have no prerequisites (in_degree == 0)
                queue = [task for task, degree in in_degree.items() if degree == 0]
                sorted_tasks = []

                while queue:
                    # Sort by order_index to maintain AI's intended sequence
                    queue.sort(key=lambda t: task_by_title.get(t, {}).get("order_index", 999))
                    current_task = queue.pop(0)
                    sorted_tasks.append(current_task)

                    # For each other task, check if it was waiting for current_task
                    for other_task, deps in graph.items():
                        if current_task in deps:
                            # other_task was depending on current_task, now completed
                            in_degree[other_task] -= 1
                            if in_degree[other_task] == 0:
                                # All prerequisites done, can schedule now
                                queue.append(other_task)

                return sorted_tasks

            sorted_task_titles = topological_sort(dependency_graph)
            sorted_tasks = [task_by_title[title] for title in sorted_task_titles if title in task_by_title]

            # ═══ Step 3: Prioritize by Deadline Urgency ═══
            # Calculate days until due date for each task
            for task in sorted_tasks:
                task["_urgency_score"] = 0
                if due_date_value:
                    days_until_due = (due_date_value - start).days
                    # More urgent = higher score
                    task["_urgency_score"] = 100 / max(1, days_until_due)

            # Sort by: dependencies first, then urgency, then order
            # (topological sort maintains dependencies, so we're golden)

            # ═══ Step 4: Smart Scheduling Loop ═══
            scheduled_tasks = []
            last_scheduled_intensity = None
            last_scheduled_end = None

            for task in sorted_tasks:
                duration_minutes = task["estimated_duration"]
                intensity = task.get("intensity", "medium")

                # Apply time multiplier if subject needs more time
                if needs_more_time:
                    duration_minutes = int(duration_minutes * 1.25)

                # Find best available slot
                scheduled = False
                search_start = start.replace(hour=0, minute=0, second=0, microsecond=0)

                # Search through days until target completion
                for day_offset in range((target_completion - search_start).days + 1):
                    if scheduled:
                        break

                    current_date = search_start + timedelta(days=day_offset)
                    day_of_week = current_date.weekday()
                    day_num = (day_of_week + 1) % 7

                    # Skip if day not available
                    if day_num not in days_available:
                        continue

                    # Check daily study limit
                    daily_minutes = get_daily_study_minutes(current_date)
                    if daily_minutes + duration_minutes > (max_daily_hours * 60):
                        continue  # Skip day if would exceed daily limit

                    # Try to schedule in available time blocks
                    for time_block in available_time_blocks:
                        if scheduled:
                            break

                        start_time_str = time_block["start"]
                        hour, minute = map(int, start_time_str.split(":"))
                        block_start = current_date.replace(hour=hour, minute=minute)

                        block_end_str = time_block["end"]
                        block_hour, block_minute = map(int, block_end_str.split(":"))
                        block_end = current_date.replace(hour=block_hour, minute=block_minute)

                        # Prioritize productivity hours for intense work
                        # (already using preferred times, so this is handled)

                        candidate_start = block_start
                        while candidate_start + timedelta(minutes=duration_minutes) <= block_end:
                            task_start = candidate_start
                            task_end = task_start + timedelta(minutes=duration_minutes)

                            # Check if slot is free (with buffer)
                            if is_slot_free(task_start, task_end, with_buffer=True):
                                # Avoid back-to-back intense sessions
                                if intensity == "intense" and last_scheduled_intensity == "intense":
                                    if last_scheduled_end and (task_start - last_scheduled_end).total_seconds() < 3600:
                                        # Less than 1 hour break between intense sessions - skip
                                        candidate_start += timedelta(minutes=slot_increment)
                                        continue

                                # Schedule the task!
                                scheduled_tasks.append({
                                    "task_id": str(task["_id"]),
                                    "title": task["title"],
                                    "scheduled_start": task_start.isoformat(),
                                    "scheduled_end": task_end.isoformat(),
                                    "duration_minutes": duration_minutes,
                                    "description": task.get("description", ""),
                                    "intensity": intensity
                                })

                                # Add to busy intervals with buffer
                                buffer_end = task_end + timedelta(minutes=BUFFER_MINUTES)
                                add_busy_interval(task_start, buffer_end)

                                last_scheduled_intensity = intensity
                                last_scheduled_end = task_end
                                scheduled = True
                                break

                            candidate_start += timedelta(minutes=slot_increment)

                # Fallback if couldn't schedule
                if not scheduled:
                    # Try to find ANY available slot without buffer constraints
                    fallback_date = start.replace(hour=10, minute=0, second=0, microsecond=0)
                    task_start = fallback_date
                    task_end = task_start + timedelta(minutes=duration_minutes)

                    scheduled_tasks.append({
                        "task_id": str(task["_id"]),
                        "title": task["title"],
                        "scheduled_start": task_start.isoformat(),
                        "scheduled_end": task_end.isoformat(),
                        "duration_minutes": duration_minutes,
                        "description": task.get("description", ""),
                        "intensity": intensity,
                        "warning": "Could not find ideal slot - may conflict with existing events"
                    })
                    add_busy_interval(task_start, task_end)

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
