"""
Function Executor Service

Executes function calls from Gemini AI to manipulate assignments,
tasks, and calendar events.
"""

from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timedelta, timezone
from dateutil import parser
import httpx
import os
import time
import uuid
import logging
import asyncio

# Handle zoneinfo compatibility for Python < 3.9 or Windows
try:
    from zoneinfo import ZoneInfo
except ImportError:
    # Fallback for older Python versions
    try:
        from backports.zoneinfo import ZoneInfo
    except ImportError:
        # Last resort: use dateutil.tz
        from dateutil.tz import gettz
        class ZoneInfo:
            """Compatibility wrapper for ZoneInfo using dateutil.tz"""
            def __init__(self, key):
                self.key = key
                self._tzinfo = gettz(key)
                if self._tzinfo is None:
                    raise ValueError(f"Unknown timezone: {key}")

            def __str__(self):
                return self.key

            def __repr__(self):
                return f"ZoneInfo(key='{self.key}')"

# Configure structured logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


class CalendarCache:
    """
    Simple in-memory cache for Google Calendar events to prevent API quota exhaustion.
    Caches events for a short TTL (default 60 seconds).
    """

    def __init__(self, ttl_seconds: int = 60):
        """
        Initialize calendar cache.

        Args:
            ttl_seconds: Time-to-live for cached entries in seconds (default: 60)
        """
        self.cache: Dict[str, Tuple[float, List[Dict[str, Any]]]] = {}
        self.ttl = ttl_seconds

    def get_events(
        self,
        user_id: str,
        start: str,
        end: str
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Get cached calendar events if available and not expired.

        Args:
            user_id: User ID
            start: Start datetime ISO string
            end: End datetime ISO string

        Returns:
            Cached events list or None if not cached/expired
        """
        cache_key = f"{user_id}:{start}:{end}"
        if cache_key in self.cache:
            cached_time, events = self.cache[cache_key]
            age_seconds = time.time() - cached_time
            if age_seconds < self.ttl:
                logger.debug(
                    f"Calendar cache HIT (age: {age_seconds:.1f}s, TTL: {self.ttl}s)",
                    extra={"cache_key": cache_key, "event_count": len(events)}
                )
                return events
            else:
                logger.debug(
                    f"Calendar cache EXPIRED (age: {age_seconds:.1f}s, TTL: {self.ttl}s)",
                    extra={"cache_key": cache_key}
                )
                del self.cache[cache_key]
        else:
            logger.debug(
                f"Calendar cache MISS",
                extra={"cache_key": cache_key}
            )
        return None

    def set_events(
        self,
        user_id: str,
        start: str,
        end: str,
        events: List[Dict[str, Any]]
    ):
        """
        Cache calendar events.

        Args:
            user_id: User ID
            start: Start datetime ISO string
            end: End datetime ISO string
            events: Events to cache
        """
        cache_key = f"{user_id}:{start}:{end}"
        self.cache[cache_key] = (time.time(), events)
        logger.debug(
            f"Calendar cache SET",
            extra={"cache_key": cache_key, "event_count": len(events)}
        )

    def clear_user(self, user_id: str):
        """
        Clear all cached events for a user.

        Args:
            user_id: User ID
        """
        keys_to_remove = [k for k in self.cache.keys() if k.startswith(f"{user_id}:")]
        for key in keys_to_remove:
            del self.cache[key]
        logger.debug(
            f"Calendar cache CLEARED for user",
            extra={"user_id": user_id, "keys_removed": len(keys_to_remove)}
        )


# Global calendar cache instance
_calendar_cache = CalendarCache(ttl_seconds=60)


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

            print(f"✅ Created assignment with ID: {assignment_id}")
            print(f"   User ID: {user_id}")
            print(f"   Title: {args['title']}")
            print(f"   Status: not_started")

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
                print(f"✅ Created subtask with ID: {task_id}")
                print(f"   User ID: {self.user_id}")
                print(f"   Assignment ID: {assignment_id}")
                print(f"   Title: {subtask_data['title']}")
                print(f"   Status: pending")
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
        preferred_end_time: Optional[str] = None,
        proposed_schedule: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Schedule tasks for an assignment using user preferences or proposed schedule.

        Args:
            user_id: User ID
            assignment_id: Assignment ID
            start_date: Start date for scheduling
            end_date: End date for scheduling (defaults to assignment due date)
            preferred_start_time: Optional specific start time (HH:MM format) when user requests exact scheduling
            preferred_end_time: Optional specific end time (HH:MM format) when user requests exact scheduling
            proposed_schedule: Optional list of pre-analyzed slots from analyze_scheduling_options
                Format: [{"task_id": "...", "start": "ISO datetime", "end": "ISO datetime"}, ...]
                If provided, these times will be used (with conflict re-verification)

        Returns:
            Dict with scheduled tasks
        """
        try:
            assignment = await self.db.get_assignment(assignment_id)
            tasks = await self.db.get_assignment_tasks(assignment_id)
            preferences = await self.db.get_user_preferences(user_id)

            if not assignment:
                return {"success": False, "error": "Assignment not found"}

            # ═══════════════════════════════════════════════════════════════
            # PROPOSED SCHEDULE MODE - Use model's pre-analyzed times
            # ═══════════════════════════════════════════════════════════════
            if proposed_schedule:
                print(f"\n{'='*60}")
                print(f"📅 USING PROPOSED SCHEDULE FROM MODEL")
                print(f"   Scheduling {len(proposed_schedule)} tasks with pre-analyzed times")
                print(f"{'='*60}\n")

                scheduled_tasks = []
                failed_tasks = []

                for proposed_slot in proposed_schedule:
                    task_id = proposed_slot.get("task_id")
                    start_iso = proposed_slot.get("start")
                    end_iso = proposed_slot.get("end")

                    if not task_id or not start_iso or not end_iso:
                        print(f"⚠️ Skipping malformed proposed slot: {proposed_slot}")
                        continue

                    # Find task
                    task = next((t for t in tasks if str(t["_id"]) == task_id), None)
                    if not task:
                        print(f"⚠️ Task {task_id} not found")
                        failed_tasks.append({
                            "task_id": task_id,
                            "error": "Task not found"
                        })
                        continue

                    task_title = task.get("title", "Untitled")

                    # Parse proposed times
                    try:
                        proposed_start = parser.parse(start_iso).replace(tzinfo=None)
                        proposed_end = parser.parse(end_iso).replace(tzinfo=None)
                    except Exception as e:
                        print(f"❌ Invalid datetime format for {task_title}: {e}")
                        failed_tasks.append({
                            "task_id": task_id,
                            "task_title": task_title,
                            "error": f"Invalid datetime format: {e}"
                        })
                        continue

                    print(f"📝 Scheduling '{task_title}' at {proposed_start} to {proposed_end}")

                    # Update task in database
                    await self.db.update_task(task_id, {
                        "scheduled_start": proposed_start,
                        "scheduled_end": proposed_end
                    })

                    # Create calendar event using atomic function (with conflict re-verification)
                    calendar_result = await create_calendar_event_atomic(
                        task_id=task_id,
                        title=f"{assignment.get('title', 'Assignment')}: {task_title}",
                        scheduled_start=proposed_start,
                        scheduled_end=proposed_end,
                        description=task.get("description", ""),
                        intensity=task.get("intensity", "normal")
                    )

                    if calendar_result.get("success"):
                        scheduled_tasks.append({
                            "task_id": task_id,
                            "task_title": task_title,
                            "start": start_iso,
                            "end": end_iso,
                            "created": True
                        })
                        print(f"   ✅ Successfully scheduled '{task_title}'")
                    else:
                        # Rollback database update
                        await self.db.update_task(task_id, {
                            "scheduled_start": None,
                            "scheduled_end": None
                        })
                        error_msg = calendar_result.get("error", "Unknown error")
                        print(f"   ❌ Failed to schedule '{task_title}': {error_msg}")
                        failed_tasks.append({
                            "task_id": task_id,
                            "task_title": task_title,
                            "error": error_msg
                        })

                # Return result
                print(f"\n{'='*60}")
                print(f"✅ Proposed schedule execution complete")
                print(f"   Scheduled: {len(scheduled_tasks)}/{len(proposed_schedule)} tasks")
                if failed_tasks:
                    print(f"   ⚠️ Failed: {len(failed_tasks)} tasks")
                print(f"{'='*60}\n")

                return {
                    "success": len(scheduled_tasks) > 0,
                    "mode": "proposed_schedule",
                    "scheduled_tasks": scheduled_tasks,
                    "failed_tasks": failed_tasks,
                    "message": f"Scheduled {len(scheduled_tasks)} tasks using proposed times"
                }

            # ═══════════════════════════════════════════════════════════════
            # NORMAL SCHEDULING MODE - Auto-find slots
            # ═══════════════════════════════════════════════════════════════

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

            # ═══════════════════════════════════════════════════════════════
            # TIMEZONE HANDLING - Use stored user timezone preference
            # ═══════════════════════════════════════════════════════════════

            # Generate unique session ID for tracking this scheduling operation
            session_id = str(uuid.uuid4())[:8]
            start_time = time.time()

            logger.info(
                "SCHEDULING_START",
                extra={
                    "session_id": session_id,
                    "user_id": user_id,
                    "assignment_id": assignment_id,
                    "task_count": len(tasks)
                }
            )

            # Get user's stored timezone from preferences
            user_timezone_str = preferences.get("timezone") if preferences else None
            user_timezone: Optional[ZoneInfo] = None
            timezone_warning_issued = False

            if user_timezone_str:
                try:
                    user_timezone = ZoneInfo(user_timezone_str)
                    logger.info(
                        "TIMEZONE_LOADED",
                        extra={
                            "session_id": session_id,
                            "timezone": user_timezone_str,
                            "source": "user_preferences"
                        }
                    )
                except Exception as e:
                    logger.warning(
                        "TIMEZONE_INVALID",
                        extra={
                            "session_id": session_id,
                            "timezone": user_timezone_str,
                            "error": str(e),
                            "fallback": "UTC"
                        }
                    )
                    timezone_warning_issued = True
            else:
                logger.warning(
                    "TIMEZONE_NOT_SET",
                    extra={
                        "session_id": session_id,
                        "user_id": user_id,
                        "detail": "User has not set timezone preference. Using UTC fallback. User should set timezone for accurate scheduling."
                    }
                )
                timezone_warning_issued = True

            # Fallback to UTC if timezone not set or invalid
            if not user_timezone:
                user_timezone = ZoneInfo("UTC")

            # Get the actual tzinfo object (for compatibility wrapper)
            user_tzinfo = getattr(user_timezone, '_tzinfo', user_timezone)

            def normalize_datetime(value: Optional[Any]) -> Optional[datetime]:
                """
                Normalize any datetime value to timezone-aware UTC datetime (naive).

                Args:
                    value: Date/time value (string, datetime, or None)

                Returns:
                    Timezone-naive UTC datetime or None

                Process:
                    1. Parse string to datetime if needed
                    2. If datetime has timezone: convert to UTC
                    3. If datetime is naive: assume it's in user's timezone, then convert to UTC
                    4. Return timezone-naive UTC datetime
                """
                if value is None:
                    return None

                dt = value
                if isinstance(value, str):
                    try:
                        dt = parser.parse(value)
                    except Exception as e:
                        logger.error(
                            "DATETIME_PARSE_ERROR",
                            extra={
                                "session_id": session_id,
                                "value": value,
                                "error": str(e)
                            }
                        )
                        return None

                if isinstance(dt, datetime):
                    if dt.tzinfo:
                        # DateTime has timezone info: convert to UTC
                        utc_dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
                        logger.debug(
                            "TIMEZONE_CONVERSION",
                            extra={
                                "session_id": session_id,
                                "original_time": str(dt),
                                "original_tz": str(dt.tzinfo),
                                "utc_time": str(utc_dt)
                            }
                        )
                        return utc_dt
                    else:
                        # DateTime is naive: assume it's in user's timezone
                        localized = dt.replace(tzinfo=user_tzinfo)
                        utc_dt = localized.astimezone(timezone.utc).replace(tzinfo=None)
                        logger.debug(
                            "NAIVE_DATETIME_LOCALIZED",
                            extra={
                                "session_id": session_id,
                                "naive_time": str(dt),
                                "assumed_tz": str(user_timezone),
                                "utc_time": str(utc_dt)
                            }
                        )
                        return utc_dt

                return None

            # Calculate start date (today or provided) - ALWAYS use UTC for consistency with calendar events
            if start_date:
                start = normalize_datetime(start_date)
            else:
                # Get current time in UTC to match calendar event timezone conversion
                start = datetime.now(timezone.utc).replace(tzinfo=None)
            if start is None:
                start = datetime.now(timezone.utc).replace(tzinfo=None)

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
            busy_intervals: List[Tuple[datetime, datetime]] = []

            def add_busy_interval(start_dt_raw: Optional[Any], end_dt_raw: Optional[Any]):
                """
                Add a busy time interval to the busy_intervals list.

                Args:
                    start_dt_raw: Start datetime (any format)
                    end_dt_raw: End datetime (any format)

                Validates and normalizes datetimes to UTC before adding.
                """
                start_dt = normalize_datetime(start_dt_raw)
                end_dt = normalize_datetime(end_dt_raw)

                if not start_dt or not end_dt:
                    logger.warning(
                        "BUSY_INTERVAL_SKIPPED_INVALID",
                        extra={
                            "session_id": session_id,
                            "start_raw": str(start_dt_raw),
                            "end_raw": str(end_dt_raw),
                            "reason": "Failed to parse datetime"
                        }
                    )
                    return

                if end_dt <= start_dt:
                    logger.warning(
                        "BUSY_INTERVAL_SKIPPED_INVALID_RANGE",
                        extra={
                            "session_id": session_id,
                            "start": str(start_dt),
                            "end": str(end_dt),
                            "reason": "End time <= start time"
                        }
                    )
                    return

                # CRITICAL ASSERTION: Verify datetimes are timezone-naive (UTC)
                assert start_dt.tzinfo is None, f"start_dt must be timezone-naive UTC, got {start_dt.tzinfo}"
                assert end_dt.tzinfo is None, f"end_dt must be timezone-naive UTC, got {end_dt.tzinfo}"

                busy_intervals.append((start_dt, end_dt))
                logger.debug(
                    "BUSY_INTERVAL_ADDED",
                    extra={
                        "session_id": session_id,
                        "start": start_dt.strftime('%Y-%m-%d %H:%M'),
                        "end": end_dt.strftime('%Y-%m-%d %H:%M'),
                        "duration_minutes": int((end_dt - start_dt).total_seconds() / 60)
                    }
                )

            # Existing calendar events
            calendar_window_end = (due_date_value or target_completion) + timedelta(days=1)
            if self.auth_token:
                events_response = await self.get_calendar_events(
                    user_id,
                    start.isoformat(),
                    calendar_window_end.isoformat()
                )
                if events_response.get("success"):
                    events_list = events_response.get("events", [])
                    logger.info(
                        "CALENDAR_EVENTS_FETCHED",
                        extra={
                            "session_id": session_id,
                            "event_count": len(events_list),
                            "source": "google_calendar"
                        }
                    )

                    for event in events_list:
                        event_title = event.get("title", "Untitled")
                        event_start = event.get("start") or event.get("start_time")
                        event_end = event.get("end") or event.get("end_time")

                        # Check if this is an all-day event
                        # All-day events have date strings without time (e.g., "2025-01-15")
                        # Regular events have full ISO datetime strings
                        is_all_day = False
                        if isinstance(event_start, str) and isinstance(event_end, str):
                            # Check if date-only format (no 'T' separator for time)
                            if 'T' not in event_start and 'T' not in event_end:
                                is_all_day = True

                        if is_all_day:
                            # All-day event: block entire day in user's timezone
                            # Parse date and create datetime for start of day and end of day
                            try:
                                start_date = parser.parse(event_start).date()
                                end_date = parser.parse(event_end).date()

                                # Create datetime at midnight in user's timezone
                                start_dt_local = datetime.combine(start_date, datetime.min.time()).replace(tzinfo=user_tzinfo)
                                # End date in Google Calendar is exclusive, so use it as-is
                                end_dt_local = datetime.combine(end_date, datetime.min.time()).replace(tzinfo=user_tzinfo)

                                # Convert to UTC for storage
                                start_dt_utc = start_dt_local.astimezone(timezone.utc).replace(tzinfo=None)
                                end_dt_utc = end_dt_local.astimezone(timezone.utc).replace(tzinfo=None)

                                logger.debug(
                                    "ALL_DAY_EVENT_DETECTED",
                                    extra={
                                        "session_id": session_id,
                                        "event_title": event_title,
                                        "start_date": str(start_date),
                                        "end_date": str(end_date),
                                        "blocks_entire_day": True
                                    }
                                )

                                add_busy_interval(start_dt_utc, end_dt_utc)
                            except Exception as e:
                                logger.error(
                                    "ALL_DAY_EVENT_PARSE_ERROR",
                                    extra={
                                        "session_id": session_id,
                                        "event_title": event_title,
                                        "error": str(e)
                                    }
                                )
                        else:
                            # Regular timed event
                            logger.debug(
                                "TIMED_EVENT_DETECTED",
                                extra={
                                    "session_id": session_id,
                                    "event_title": event_title,
                                    "start": str(event_start),
                                    "end": str(event_end)
                                }
                            )
                            add_busy_interval(event_start, event_end)

            # Existing scheduled tasks from ALL assignments (not just this one)
            # CRITICAL: Load all previously scheduled tasks from database
            all_scheduled_tasks = await self.db.db.subtasks.find({
                "user_id": user_id,
                "scheduled_start": {"$exists": True, "$ne": None},
                "scheduled_end": {"$exists": True, "$ne": None}
            }).to_list(length=1000)

            print(f"DEBUG: Found {len(all_scheduled_tasks)} previously scheduled tasks across all assignments")
            for scheduled_task in all_scheduled_tasks:
                task_start = scheduled_task.get("scheduled_start")
                task_end = scheduled_task.get("scheduled_end")
                task_title = scheduled_task.get("title", "Unknown")
                print(f"DEBUG: Previously scheduled task: '{task_title}' - {task_start} to {task_end}")
                add_busy_interval(task_start, task_end)

            # ═══════════════════════════════════════════════════════════════
            # SMART SCHEDULING ALGORITHM
            # ═══════════════════════════════════════════════════════════════

            # Get configurable buffer from user preferences (default: 15 minutes)
            BUFFER_MINUTES = study_settings.get("scheduleBuffer", 15)
            logger.info(
                "SCHEDULING_CONFIG",
                extra={
                    "session_id": session_id,
                    "buffer_minutes": BUFFER_MINUTES,
                    "max_daily_hours": study_settings.get("maxDailyStudyHours", 6),
                    "days_available": days_available,
                    "timezone": str(user_timezone)
                }
            )

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

            async def create_calendar_event_atomic(
                task_id: str,
                title: str,
                scheduled_start: datetime,
                scheduled_end: datetime,
                description: str = "",
                intensity: str = "normal",
                max_retries: int = 3
            ) -> Dict[str, Any]:
                """
                Atomically create a calendar event with retry logic and conflict detection.

                This function minimizes the TOCTOU (Time-of-Check-Time-of-Use) vulnerability
                by fetching fresh calendar data immediately before creating the event,
                and retrying if a race condition is detected.

                Args:
                    task_id: Task database ID
                    title: Event title
                    scheduled_start: Start datetime (UTC naive)
                    scheduled_end: End datetime (UTC naive)
                    description: Event description
                    intensity: Task intensity level
                    max_retries: Maximum retry attempts

                Returns:
                    Dict with success status and event details or error
                """
                for attempt in range(max_retries):
                    try:
                        # Add exponential backoff delay for retries
                        if attempt > 0:
                            delay = (2 ** attempt) * 0.5  # 0.5s, 1s, 2s
                            logger.info(
                                "ATOMIC_CREATE_RETRY_DELAY",
                                extra={
                                    "session_id": session_id,
                                    "task_id": task_id,
                                    "attempt": attempt + 1,
                                    "delay_seconds": delay
                                }
                            )
                            await asyncio.sleep(delay)

                        # STEP 1: Re-fetch fresh calendar data for narrow time window
                        # This minimizes the race condition window
                        buffer_window = timedelta(hours=1)
                        window_start = (scheduled_start - buffer_window).isoformat()
                        window_end = (scheduled_end + buffer_window).isoformat()

                        # Try cache first
                        cached_events = _calendar_cache.get_events(user_id, window_start, window_end)

                        if cached_events is None:
                            # Cache miss - fetch from API
                            fresh_events_response = await self.get_calendar_events(
                                user_id,
                                window_start,
                                window_end
                            )
                            if fresh_events_response.get("success"):
                                fresh_events = fresh_events_response.get("events", [])
                                _calendar_cache.set_events(user_id, window_start, window_end, fresh_events)
                            else:
                                fresh_events = []
                        else:
                            fresh_events = cached_events

                        logger.debug(
                            "ATOMIC_CREATE_FRESH_CHECK",
                            extra={
                                "session_id": session_id,
                                "task_id": task_id,
                                "attempt": attempt + 1,
                                "events_in_window": len(fresh_events)
                            }
                        )

                        # STEP 2: Check for conflicts in fresh data
                        conflict_detected = False
                        for event in fresh_events:
                            event_start = event.get("start") or event.get("start_time")
                            event_end = event.get("end") or event.get("end_time")

                            event_start_dt = normalize_datetime(event_start)
                            event_end_dt = normalize_datetime(event_end)

                            if event_start_dt and event_end_dt:
                                # Check if overlaps with our proposed time
                                if scheduled_start < event_end_dt and scheduled_end > event_start_dt:
                                    conflict_detected = True
                                    logger.warning(
                                        "ATOMIC_CREATE_CONFLICT_DETECTED",
                                        extra={
                                            "session_id": session_id,
                                            "task_id": task_id,
                                            "attempt": attempt + 1,
                                            "conflicting_event": event.get("title", "Unknown"),
                                            "event_start": str(event_start),
                                            "event_end": str(event_end)
                                        }
                                    )
                                    break

                        if conflict_detected:
                            # Race condition detected - manual event was created
                            # Return special error code so caller can reschedule
                            return {
                                "success": False,
                                "error": "CONFLICT_DETECTED",
                                "message": "Another event was created in this time slot. Task needs rescheduling.",
                                "retry": attempt < max_retries - 1
                            }

                        # STEP 3: No conflict - proceed with event creation
                        if not self.auth_token:
                            return {
                                "success": False,
                                "error": "NO_AUTH_TOKEN",
                                "message": "No authentication token available"
                            }

                        task_data = {
                            "task_id": task_id,
                            "title": title,
                            "scheduled_start": scheduled_start.isoformat() + "Z",
                            "scheduled_end": scheduled_end.isoformat() + "Z",
                            "duration_minutes": int((scheduled_end - scheduled_start).total_seconds() / 60),
                            "description": description,
                            "intensity": intensity
                        }

                        print(f"\n{'='*60}")
                        print(f"📅 CREATING CALENDAR EVENT")
                        print(f"   Title: {title}")
                        print(f"   Start: {scheduled_start.isoformat()}")
                        print(f"   End: {scheduled_end.isoformat()}")
                        print(f"   API URL: {self.api_base_url}/api/calendar/create-events")
                        print(f"   Auth token present: {bool(self.auth_token)}")
                        print(f"{'='*60}\n")

                        async with httpx.AsyncClient() as client:
                            response = await client.post(
                                f"{self.api_base_url}/api/calendar/create-events",
                                json={"tasks": [task_data]},  # Single task
                                headers={"Authorization": f"Bearer {self.auth_token}"},
                                timeout=30.0
                            )

                            print(f"\n{'='*60}")
                            print(f"📡 CALENDAR API RESPONSE")
                            print(f"   Status Code: {response.status_code}")
                            print(f"   Response Body: {response.text[:500]}")
                            print(f"{'='*60}\n")

                            if response.status_code == 200:
                                result = response.json()
                                created_events = result.get("created_events", [])
                                errors = result.get("errors", [])

                                print(f"\n{'='*60}")
                                print(f"✅ CALENDAR API SUCCESS (200 OK)")
                                print(f"   Created events: {len(created_events)}")
                                print(f"   Errors: {len(errors)}")
                                if created_events:
                                    print(f"   Event ID: {created_events[0].get('id')}")
                                    print(f"   Event details: {created_events[0]}")
                                if errors:
                                    print(f"   Error details: {errors}")
                                print(f"{'='*60}\n")

                                if len(created_events) > 0:
                                    # Success!
                                    logger.info(
                                        "ATOMIC_CREATE_SUCCESS",
                                        extra={
                                            "session_id": session_id,
                                            "task_id": task_id,
                                            "attempt": attempt + 1,
                                            "event_id": created_events[0].get("id")
                                        }
                                    )

                                    # Clear cache so next fetch gets fresh data
                                    _calendar_cache.clear_user(user_id)

                                    return {
                                        "success": True,
                                        "event": created_events[0],
                                        "attempts": attempt + 1
                                    }
                                else:
                                    # Event creation failed
                                    error_msg = errors[0] if errors else "Unknown error"

                                    print(f"\n{'='*60}")
                                    print(f"❌ CALENDAR EVENT CREATION FAILED")
                                    print(f"   Error: {error_msg}")
                                    print(f"   Full result: {result}")
                                    print(f"{'='*60}\n")

                                    logger.error(
                                        "ATOMIC_CREATE_FAILED",
                                        extra={
                                            "session_id": session_id,
                                            "task_id": task_id,
                                            "attempt": attempt + 1,
                                            "error": error_msg
                                        }
                                    )

                                    # Check if it's a conflict error from Google Calendar
                                    if "conflict" in str(error_msg).lower() or "overlap" in str(error_msg).lower():
                                        return {
                                            "success": False,
                                            "error": "CONFLICT_DETECTED",
                                            "message": str(error_msg),
                                            "retry": attempt < max_retries - 1
                                        }

                                    # Other error - don't retry
                                    return {
                                        "success": False,
                                        "error": "API_ERROR",
                                        "message": str(error_msg)
                                    }
                            else:
                                print(f"\n{'='*60}")
                                print(f"❌ CALENDAR API ERROR (Status {response.status_code})")
                                print(f"   Response: {response.text}")
                                print(f"   Will retry: {response.status_code >= 500 and attempt < max_retries - 1}")
                                print(f"{'='*60}\n")

                                logger.error(
                                    "ATOMIC_CREATE_API_ERROR",
                                    extra={
                                        "session_id": session_id,
                                        "task_id": task_id,
                                        "attempt": attempt + 1,
                                        "status_code": response.status_code,
                                        "response": response.text
                                    }
                                )
                                # Retry on server errors
                                if response.status_code >= 500 and attempt < max_retries - 1:
                                    continue
                                return {
                                    "success": False,
                                    "error": "API_ERROR",
                                    "message": f"API returned {response.status_code}: {response.text[:200]}"
                                }

                    except Exception as e:
                        import traceback
                        error_traceback = traceback.format_exc()

                        print(f"\n{'='*60}")
                        print(f"❌ EXCEPTION DURING CALENDAR EVENT CREATION")
                        print(f"   Exception Type: {type(e).__name__}")
                        print(f"   Exception Message: {str(e)}")
                        print(f"   Attempt: {attempt + 1}/{max_retries}")
                        print(f"\nFull Traceback:")
                        print(error_traceback)
                        print(f"{'='*60}\n")

                        logger.error(
                            "ATOMIC_CREATE_EXCEPTION",
                            extra={
                                "session_id": session_id,
                                "task_id": task_id,
                                "attempt": attempt + 1,
                                "exception": str(e),
                                "exception_type": type(e).__name__
                            }
                        )
                        if attempt < max_retries - 1:
                            continue
                        return {
                            "success": False,
                            "error": "EXCEPTION",
                            "message": f"{type(e).__name__}: {str(e)}"
                        }

                # Max retries exceeded
                return {
                    "success": False,
                    "error": "MAX_RETRIES_EXCEEDED",
                    "message": f"Failed after {max_retries} attempts"
                }

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

                        # User's preferred times are in their LOCAL timezone, convert to UTC
                        if user_tz_offset is not None:
                            # Create time in user's local timezone, then convert to UTC
                            local_time = current_date.replace(hour=hour, minute=minute)
                            block_start = local_time - user_tz_offset
                            print(f"DEBUG: Converted {hour}:{minute:02d} local to {block_start.strftime('%H:%M')} UTC (offset: {user_tz_offset})")
                        else:
                            # No timezone info available, treat as UTC (fallback)
                            block_start = current_date.replace(hour=hour, minute=minute)
                            print(f"WARNING: No timezone detected, treating {hour}:{minute:02d} as UTC")

                        block_end_str = time_block["end"]
                        block_hour, block_minute = map(int, block_end_str.split(":"))

                        if user_tz_offset is not None:
                            local_time_end = current_date.replace(hour=block_hour, minute=block_minute)
                            block_end = local_time_end - user_tz_offset
                        else:
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

                                # ═══════════════════════════════════════════════════════
                                # ATOMIC SCHEDULING WITH COMPENSATING TRANSACTION
                                # ═══════════════════════════════════════════════════════

                                # Include assignment title in task title for consistent color assignment
                                full_title = f"{assignment['title']} - {task['title']}"

                                # STEP 1: Create snapshot for rollback
                                task_snapshot = {
                                    "task_id": str(task["_id"]),
                                    "previous_scheduled_start": task.get("scheduled_start"),
                                    "previous_scheduled_end": task.get("scheduled_end")
                                }

                                # STEP 2: Tentatively update database
                                await self.db.update_task(
                                    str(task["_id"]),
                                    {
                                        "scheduled_start": task_start,
                                        "scheduled_end": task_end
                                    }
                                )

                                logger.info(
                                    "TASK_DB_UPDATED_TENTATIVE",
                                    extra={
                                        "session_id": session_id,
                                        "task_id": str(task["_id"]),
                                        "task_title": task['title'],
                                        "start": task_start.strftime('%Y-%m-%d %H:%M'),
                                        "end": task_end.strftime('%Y-%m-%d %H:%M')
                                    }
                                )

                                # STEP 3: Atomically create calendar event with retry
                                calendar_result = await create_calendar_event_atomic(
                                    task_id=str(task["_id"]),
                                    title=full_title,
                                    scheduled_start=task_start,
                                    scheduled_end=task_end,
                                    description=task.get("description", ""),
                                    intensity=intensity
                                )

                                if calendar_result.get("success"):
                                    # SUCCESS: Calendar event created successfully
                                    scheduled_tasks.append({
                                        "task_id": str(task["_id"]),
                                        "title": full_title,
                                        "scheduled_start": task_start.isoformat() + "Z",
                                        "scheduled_end": task_end.isoformat() + "Z",
                                        "duration_minutes": duration_minutes,
                                        "description": task.get("description", ""),
                                        "intensity": intensity,
                                        "calendar_event_id": calendar_result.get("event", {}).get("id"),
                                        "attempts": calendar_result.get("attempts", 1)
                                    })

                                    # Add to busy intervals to prevent future conflicts
                                    add_busy_interval(task_start, task_end)

                                    last_scheduled_intensity = intensity
                                    last_scheduled_end = task_end
                                    scheduled = True

                                    logger.info(
                                        "TASK_SCHEDULED_SUCCESS",
                                        extra={
                                            "session_id": session_id,
                                            "task_id": str(task["_id"]),
                                            "task_title": task['title'],
                                            "attempts": calendar_result.get("attempts", 1)
                                        }
                                    )
                                    break

                                else:
                                    # FAILURE: Rollback database update
                                    rollback_data = {}
                                    if task_snapshot["previous_scheduled_start"]:
                                        rollback_data["scheduled_start"] = task_snapshot["previous_scheduled_start"]
                                    if task_snapshot["previous_scheduled_end"]:
                                        rollback_data["scheduled_end"] = task_snapshot["previous_scheduled_end"]

                                    if rollback_data:
                                        await self.db.update_task(
                                            task_snapshot["task_id"],
                                            rollback_data
                                        )
                                    else:
                                        # Task was never scheduled - remove schedule fields
                                        await self.db.update_task(
                                            task_snapshot["task_id"],
                                            {
                                                "scheduled_start": None,
                                                "scheduled_end": None
                                            }
                                        )

                                    logger.warning(
                                        "TASK_SCHEDULE_ROLLBACK",
                                        extra={
                                            "session_id": session_id,
                                            "task_id": str(task["_id"]),
                                            "task_title": task['title'],
                                            "error": calendar_result.get("error"),
                                            "error_detail": calendar_result.get("message")
                                        }
                                    )

                                    # If conflict detected, move to next slot
                                    # Otherwise, this task failed permanently
                                    if calendar_result.get("error") == "CONFLICT_DETECTED":
                                        # Try next slot in this time block
                                        candidate_start += timedelta(minutes=slot_increment)
                                        continue
                                    else:
                                        # Permanent failure - will try fallback later
                                        break

                            candidate_start += timedelta(minutes=slot_increment)

                # Fallback if couldn't schedule in preferred times
                if not scheduled:
                    print(f"WARNING: Could not schedule '{task['title']}' in preferred times, searching for ANY free slot...")

                    # Try to find ANY available slot across extended date range
                    extended_days = 30  # Look up to 30 days ahead
                    fallback_found = False

                    for day_offset in range(extended_days):
                        if fallback_found:
                            break

                        fallback_date = (start + timedelta(days=day_offset)).replace(hour=9, minute=0, second=0, microsecond=0)

                        # Try every hour of the day
                        for hour_offset in range(14):  # 9am to 11pm
                            candidate_start = fallback_date + timedelta(hours=hour_offset)
                            candidate_end = candidate_start + timedelta(minutes=duration_minutes)

                            # Check if this slot is actually free (keep buffer for safety)
                            if is_slot_free(candidate_start, candidate_end, with_buffer=True):
                                task_start = candidate_start
                                task_end = candidate_end
                                fallback_found = True
                                logger.info(
                                    "FALLBACK_SLOT_FOUND",
                                    extra={
                                        "session_id": session_id,
                                        "task_id": str(task["_id"]),
                                        "task_title": task['title'],
                                        "start": task_start.strftime('%Y-%m-%d %H:%M')
                                    }
                                )
                                break

                    if not fallback_found:
                        # Absolutely no slots available - skip this task
                        logger.error(
                            "TASK_NO_SLOTS_AVAILABLE",
                            extra={
                                "session_id": session_id,
                                "task_id": str(task["_id"]),
                                "task_title": task['title'],
                                "extended_days": extended_days
                            }
                        )
                        continue  # Skip to next task

                    # ═══════════════════════════════════════════════════════
                    # FALLBACK: ATOMIC SCHEDULING WITH COMPENSATING TRANSACTION
                    # ═══════════════════════════════════════════════════════

                    full_title = f"{assignment['title']} - {task['title']}"

                    # STEP 1: Create snapshot for rollback
                    task_snapshot = {
                        "task_id": str(task["_id"]),
                        "previous_scheduled_start": task.get("scheduled_start"),
                        "previous_scheduled_end": task.get("scheduled_end")
                    }

                    # STEP 2: Tentatively update database
                    await self.db.update_task(
                        str(task["_id"]),
                        {
                            "scheduled_start": task_start,
                            "scheduled_end": task_end
                        }
                    )

                    # STEP 3: Atomically create calendar event with retry
                    calendar_result = await create_calendar_event_atomic(
                        task_id=str(task["_id"]),
                        title=full_title,
                        scheduled_start=task_start,
                        scheduled_end=task_end,
                        description=task.get("description", ""),
                        intensity=intensity
                    )

                    if calendar_result.get("success"):
                        # SUCCESS
                        scheduled_tasks.append({
                            "task_id": str(task["_id"]),
                            "title": full_title,
                            "scheduled_start": task_start.isoformat() + "Z",
                            "scheduled_end": task_end.isoformat() + "Z",
                            "duration_minutes": duration_minutes,
                            "description": task.get("description", ""),
                            "intensity": intensity,
                            "calendar_event_id": calendar_result.get("event", {}).get("id"),
                            "warning": "Scheduled in fallback slot outside preferred times"
                        })

                        add_busy_interval(task_start, task_end)

                        logger.info(
                            "FALLBACK_TASK_SCHEDULED_SUCCESS",
                            extra={
                                "session_id": session_id,
                                "task_id": str(task["_id"]),
                                "task_title": task['title']
                            }
                        )
                    else:
                        # FAILURE: Rollback
                        rollback_data = {}
                        if task_snapshot["previous_scheduled_start"]:
                            rollback_data["scheduled_start"] = task_snapshot["previous_scheduled_start"]
                        if task_snapshot["previous_scheduled_end"]:
                            rollback_data["scheduled_end"] = task_snapshot["previous_scheduled_end"]

                        if rollback_data:
                            await self.db.update_task(task_snapshot["task_id"], rollback_data)
                        else:
                            await self.db.update_task(
                                task_snapshot["task_id"],
                                {"scheduled_start": None, "scheduled_end": None}
                            )

                        logger.error(
                            "FALLBACK_TASK_SCHEDULE_FAILED",
                            extra={
                                "session_id": session_id,
                                "task_id": str(task["_id"]),
                                "task_title": task['title'],
                                "error": calendar_result.get("error")
                            }
                        )

            # ═══════════════════════════════════════════════════════════════
            # SCHEDULING COMPLETE - GENERATE SUMMARY AND PERFORMANCE METRICS
            # ═══════════════════════════════════════════════════════════════

            end_time = time.time()
            duration_seconds = end_time - start_time

            # Count successes and failures
            successful_count = len(scheduled_tasks)
            failed_count = len(tasks) - successful_count
            total_retries = sum(task.get("attempts", 1) - 1 for task in scheduled_tasks)

            logger.info(
                "SCHEDULING_COMPLETE",
                extra={
                    "session_id": session_id,
                    "duration_seconds": round(duration_seconds, 2),
                    "total_tasks": len(tasks),
                    "successful_tasks": successful_count,
                    "failed_tasks": failed_count,
                    "total_retries": total_retries,
                    "timezone_warning": timezone_warning_issued
                }
            )

            # Build detailed success message
            messages = []
            messages.append(f"Successfully scheduled {successful_count} of {len(tasks)} tasks")

            if timezone_warning_issued:
                messages.append("⚠️  WARNING: User timezone not set. Using UTC fallback. Please set timezone in preferences for accurate scheduling.")

            if failed_count > 0:
                messages.append(f"{failed_count} task(s) could not be scheduled due to conflicts or errors")

            if total_retries > 0:
                messages.append(f"Handled {total_retries} scheduling conflict(s) with automatic retry")

            # Extract calendar event IDs for response
            calendar_events = [
                {
                    "id": task.get("calendar_event_id"),
                    "task_id": task["task_id"],
                    "title": task["title"],
                    "start": task["scheduled_start"],
                    "end": task["scheduled_end"]
                }
                for task in scheduled_tasks
                if task.get("calendar_event_id")
            ]

            if successful_count > 0:
                return {
                    "success": True,
                    "scheduled_tasks": scheduled_tasks,
                    "calendar_events": calendar_events,
                    "message": ". ".join(messages),
                    "metrics": {
                        "duration_seconds": round(duration_seconds, 2),
                        "successful_count": successful_count,
                        "failed_count": failed_count,
                        "total_retries": total_retries,
                        "timezone_warning": timezone_warning_issued
                    }
                }
            else:
                return {
                    "success": False,
                    "error": "Failed to schedule any tasks. All slots may be occupied or calendar conflicts detected.",
                    "scheduled_tasks": [],
                    "calendar_events": [],
                    "message": ". ".join(messages)
                }

        except Exception as e:
            import traceback
            error_traceback = traceback.format_exc()

            logger.error(
                "SCHEDULING_EXCEPTION",
                extra={
                    "session_id": session_id if 'session_id' in locals() else "unknown",
                    "exception": str(e),
                    "exception_type": type(e).__name__
                }
            )

            # Print full traceback for debugging
            print(f"\n{'='*60}")
            print(f"ERROR: Scheduling exception occurred")
            print(f"Exception Type: {type(e).__name__}")
            print(f"Exception Message: {str(e)}")
            print(f"\nFull Traceback:")
            print(error_traceback)
            print(f"{'='*60}\n")

            return {
                "success": False,
                "error": f"{type(e).__name__}: {str(e)}",
                "traceback": error_traceback
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

    async def get_scheduling_context(
        self,
        user_id: str,
        date_range_start: str,
        date_range_end: str
    ) -> Dict[str, Any]:
        """
        Get comprehensive scheduling context for the model to understand constraints.

        Args:
            user_id: User ID
            date_range_start: Start date (YYYY-MM-DD)
            date_range_end: End date (YYYY-MM-DD)

        Returns:
            Dict with:
                - time_ranges: Definitions of morning/midday/evening
                - user_preferences: User's study preferences
                - calendar_availability: Calendar events in the date range
                - timezone: User's timezone
                - buffer_minutes: Buffer between tasks
        """
        print(f"\n{'='*60}")
        print(f"📋 GET_SCHEDULING_CONTEXT")
        print(f"Date range: {date_range_start} to {date_range_end}")
        print(f"{'='*60}\n")

        try:
            # Define time ranges
            time_ranges = {
                "morning": {
                    "start": "08:00",
                    "end": "12:00",
                    "description": "Morning hours (8am - 12pm)"
                },
                "midday": {
                    "start": "12:00",
                    "end": "17:00",
                    "description": "Midday/Afternoon hours (12pm - 5pm)"
                },
                "evening": {
                    "start": "17:00",
                    "end": "21:00",
                    "description": "Evening hours (5pm - 9pm)"
                }
            }

            # Get user preferences
            preferences = await self.db.get_user_preferences(user_id)
            study_settings = preferences.get("studySettings", {}) if preferences else {}

            # Format user preferences
            user_prefs = {
                "timezone": preferences.get("timezone", "UTC") if preferences else "UTC",
                "productivity_pattern": study_settings.get("productivityPattern", "midday"),
                "preferred_study_times": study_settings.get("preferredStudyTimes", []),
                "days_available": study_settings.get("daysAvailable", [1, 2, 3, 4, 5]),
                "max_daily_study_hours": study_settings.get("maxDailyStudyHours", 6),
                "max_task_duration": study_settings.get("maxTaskDuration", 120),
                "buffer_minutes": study_settings.get("scheduleBuffer", 15)
            }

            # Fetch calendar events for the date range
            start_dt = f"{date_range_start}T00:00:00"
            end_dt = f"{date_range_end}T23:59:59"

            calendar_result = await self.get_calendar_events(user_id, start_dt, end_dt)
            calendar_events = calendar_result.get("events", [])

            # Calculate daily availability windows
            daily_availability = {}
            current_date = datetime.fromisoformat(date_range_start)
            end_date = datetime.fromisoformat(date_range_end)

            while current_date <= end_date:
                date_str = current_date.strftime("%Y-%m-%d")
                day_of_week = current_date.weekday()  # 0=Monday, 6=Sunday

                # Check if this day is in user's available days
                # Convert Monday=0 to Sunday=0 format
                user_day = (day_of_week + 1) % 7

                if user_day in user_prefs["days_available"]:
                    # Get events for this day
                    day_events = [
                        e for e in calendar_events
                        if e.get("start", "").startswith(date_str)
                    ]

                    daily_availability[date_str] = {
                        "available": True,
                        "day_of_week": current_date.strftime("%A"),
                        "events_count": len(day_events),
                        "events": day_events
                    }
                else:
                    daily_availability[date_str] = {
                        "available": False,
                        "day_of_week": current_date.strftime("%A"),
                        "reason": "Not in user's available study days"
                    }

                current_date += timedelta(days=1)

            # Build comprehensive response
            context = {
                "success": True,
                "time_ranges": time_ranges,
                "user_preferences": user_prefs,
                "calendar_events": calendar_events,
                "daily_availability": daily_availability,
                "date_range": {
                    "start": date_range_start,
                    "end": date_range_end
                }
            }

            print(f"✅ Context gathered successfully:")
            print(f"   - Timezone: {user_prefs['timezone']}")
            print(f"   - Productivity pattern: {user_prefs['productivity_pattern']}")
            print(f"   - Calendar events: {len(calendar_events)}")
            print(f"   - Available days: {len([d for d in daily_availability.values() if d.get('available')])}/{len(daily_availability)}")

            return context

        except Exception as e:
            print(f"❌ ERROR getting scheduling context: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "error": str(e),
                "time_ranges": {
                    "morning": {"start": "08:00", "end": "12:00"},
                    "midday": {"start": "12:00", "end": "17:00"},
                    "evening": {"start": "17:00", "end": "21:00"}
                }
            }

    async def analyze_scheduling_options(
        self,
        user_id: str,
        assignment_id: str,
        date_range_start: str,
        date_range_end: str,
        preferred_times: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Analyze potential scheduling options for tasks with reasoning.

        Args:
            user_id: User ID
            assignment_id: Assignment whose tasks need scheduling
            date_range_start: Start date (YYYY-MM-DD)
            date_range_end: End date (YYYY-MM-DD)
            preferred_times: Optional user-specified time windows [{start: HH:MM, end: HH:MM}]

        Returns:
            Dict with analyzed slots for each task, scored and explained
        """
        print(f"\n{'='*60}")
        print(f"🔍 ANALYZE_SCHEDULING_OPTIONS")
        print(f"Assignment: {assignment_id}")
        print(f"Date range: {date_range_start} to {date_range_end}")
        if preferred_times:
            print(f"User-specified times (type: {type(preferred_times)}): {preferred_times}")

            # Validate preferred_times format
            if not isinstance(preferred_times, list):
                print(f"⚠️ WARNING: preferred_times is not a list, got {type(preferred_times)}")
                preferred_times = None
            else:
                for i, pt in enumerate(preferred_times):
                    if not isinstance(pt, dict):
                        print(f"⚠️ WARNING: preferred_times[{i}] is not a dict, got {type(pt)}: {pt}")
                    elif "start" not in pt or "end" not in pt:
                        print(f"⚠️ WARNING: preferred_times[{i}] missing 'start' or 'end' keys: {pt}")
        print(f"{'='*60}\n")

        try:
            # Get assignment and tasks
            assignment = await self.db.get_assignment(assignment_id)
            if not assignment:
                return {
                    "success": False,
                    "error": f"Assignment {assignment_id} not found"
                }

            tasks = await self.db.get_assignment_tasks(assignment_id)
            if not tasks:
                return {
                    "success": False,
                    "error": "No tasks found for this assignment"
                }

            # Get scheduling context
            context = await self.get_scheduling_context(user_id, date_range_start, date_range_end)
            if not context.get("success"):
                return {
                    "success": False,
                    "error": "Failed to get scheduling context"
                }

            time_ranges = context["time_ranges"]
            user_prefs = context["user_preferences"]
            calendar_events = context["calendar_events"]
            buffer_minutes = user_prefs["buffer_minutes"]

            print(f"\n{'='*60}")
            print(f"📅 CALENDAR EVENTS FOUND FOR ANALYSIS")
            print(f"   Date range: {date_range_start} to {date_range_end}")
            print(f"   Total events: {len(calendar_events)}")
            print(f"{'='*60}\n")

            # Build busy intervals from calendar events
            busy_intervals = []
            for event in calendar_events:
                try:
                    start_str = event.get("start", "")
                    end_str = event.get("end", "")
                    if start_str and end_str:
                        start_dt = parser.parse(start_str).replace(tzinfo=None)
                        end_dt = parser.parse(end_str).replace(tzinfo=None)
                        busy_intervals.append((start_dt, end_dt, event.get("title", "Untitled")))
                        print(f"   📌 Busy: {event.get('title', 'Untitled')}")
                        print(f"      {start_dt} to {end_dt}")
                except Exception as e:
                    print(f"⚠️ Warning: Could not parse event: {e}")
                    continue

            print(f"\n   Total busy intervals: {len(busy_intervals)}")
            print(f"{'='*60}\n")

            # Analyze each task
            task_analyses = []

            for task in tasks:
                task_id = str(task["_id"])
                task_title = task.get("title", "Untitled")
                duration_minutes = task.get("estimated_duration", 60)
                intensity = task.get("intensity", "medium")

                print(f"\n📝 Analyzing task: {task_title} ({duration_minutes} min, {intensity} intensity)")

                # Find potential slots
                slots = self._find_potential_slots(
                    date_range_start=date_range_start,
                    date_range_end=date_range_end,
                    duration_minutes=duration_minutes,
                    busy_intervals=busy_intervals,
                    user_prefs=user_prefs,
                    time_ranges=time_ranges,
                    preferred_times=preferred_times,
                    buffer_minutes=buffer_minutes
                )

                # Score and explain each slot
                scored_slots = []
                for slot in slots:
                    score, reasons = self._score_slot(
                        slot=slot,
                        user_prefs=user_prefs,
                        time_ranges=time_ranges,
                        preferred_times=preferred_times,
                        busy_intervals=busy_intervals,
                        buffer_minutes=buffer_minutes
                    )

                    scored_slots.append({
                        "start": slot["start"].isoformat(),
                        "end": slot["end"].isoformat(),
                        "score": score,
                        "reasons": reasons,
                        "date": slot["start"].strftime("%Y-%m-%d"),
                        "time_of_day": slot["time_of_day"]
                    })

                # Sort by score (highest first)
                scored_slots.sort(key=lambda x: x["score"], reverse=True)

                # Take top 5 slots
                top_slots = scored_slots[:5]

                task_analyses.append({
                    "task_id": task_id,
                    "task_title": task_title,
                    "duration_minutes": duration_minutes,
                    "intensity": intensity,
                    "recommended_slots": top_slots,
                    "total_slots_found": len(scored_slots)
                })

                if top_slots:
                    best = top_slots[0]
                    print(f"   ✅ Best slot: {best['start']} (score: {best['score']:.2f})")
                    print(f"      Reasons: {', '.join(best['reasons'])}")
                else:
                    print(f"   ❌ No viable slots found")

            return {
                "success": True,
                "assignment_id": assignment_id,
                "assignment_title": assignment.get("title", "Untitled"),
                "task_analyses": task_analyses,
                "context": {
                    "time_ranges": time_ranges,
                    "user_productivity_pattern": user_prefs["productivity_pattern"],
                    "buffer_minutes": buffer_minutes,
                    "calendar_events_count": len(calendar_events)
                }
            }

        except Exception as e:
            print(f"❌ ERROR analyzing scheduling options: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "error": str(e)
            }

    def _find_potential_slots(
        self,
        date_range_start: str,
        date_range_end: str,
        duration_minutes: int,
        busy_intervals: List[Tuple],
        user_prefs: Dict,
        time_ranges: Dict,
        preferred_times: Optional[List[Dict]],
        buffer_minutes: int
    ) -> List[Dict]:
        """Find all potential time slots for a task."""
        slots = []

        # Parse date range
        start_date = datetime.fromisoformat(date_range_start)
        end_date = datetime.fromisoformat(date_range_end)

        # Determine time windows to search
        if preferred_times:
            # User specified exact times - validate and use those
            time_windows = []
            for pref_time in preferred_times:
                # Handle both dict and other formats
                if isinstance(pref_time, dict) and "start" in pref_time and "end" in pref_time:
                    time_windows.append(pref_time)
                else:
                    print(f"⚠️ Warning: Invalid preferred_time format: {pref_time}")

            # If no valid windows, fall back to user preferences
            if not time_windows:
                print(f"⚠️ No valid preferred_times found, using user preferences")
                preferred_times = None

        if not preferred_times:
            if user_prefs.get("preferred_study_times"):
                # User has configured preferred times
                time_windows = user_prefs["preferred_study_times"]
            else:
                # Use productivity pattern
                pattern = user_prefs.get("productivity_pattern", "midday")
                time_window = time_ranges.get(pattern, time_ranges["midday"])
                time_windows = [{"start": time_window["start"], "end": time_window["end"]}]

        # Iterate through each day
        current_date = start_date
        while current_date <= end_date:
            day_of_week = (current_date.weekday() + 1) % 7  # Convert to Sunday=0

            # Check if day is available
            if day_of_week not in user_prefs.get("days_available", [1, 2, 3, 4, 5]):
                current_date += timedelta(days=1)
                continue

            # Try each time window
            for window in time_windows:
                try:
                    start_time = datetime.strptime(window["start"], "%H:%M").time()
                    end_time = datetime.strptime(window["end"], "%H:%M").time()

                    window_start = datetime.combine(current_date.date(), start_time)
                    window_end = datetime.combine(current_date.date(), end_time)

                    # Find slots within this window (30-minute intervals)
                    current_slot_start = window_start
                    while current_slot_start + timedelta(minutes=duration_minutes) <= window_end:
                        slot_end = current_slot_start + timedelta(minutes=duration_minutes)

                        # Check if slot is free (with buffer)
                        is_free = True
                        for busy_start, busy_end, title in busy_intervals:
                            # Add buffer to busy intervals
                            buffered_busy_start = busy_start - timedelta(minutes=buffer_minutes)
                            buffered_busy_end = busy_end + timedelta(minutes=buffer_minutes)

                            if current_slot_start < buffered_busy_end and slot_end > buffered_busy_start:
                                is_free = False
                                break

                        if is_free:
                            # Determine time of day
                            slot_hour = current_slot_start.hour
                            if 8 <= slot_hour < 12:
                                time_of_day = "morning"
                            elif 12 <= slot_hour < 17:
                                time_of_day = "midday"
                            elif 17 <= slot_hour < 21:
                                time_of_day = "evening"
                            else:
                                time_of_day = "other"

                            slots.append({
                                "start": current_slot_start,
                                "end": slot_end,
                                "time_of_day": time_of_day
                            })

                        # Move to next 30-minute interval
                        current_slot_start += timedelta(minutes=30)

                except Exception as e:
                    print(f"⚠️ Warning: Error processing time window {window}: {e}")
                    continue

            current_date += timedelta(days=1)

        return slots

    def _score_slot(
        self,
        slot: Dict,
        user_prefs: Dict,
        time_ranges: Dict,
        preferred_times: Optional[List[Dict]],
        busy_intervals: List[Tuple],
        buffer_minutes: int
    ) -> Tuple[float, List[str]]:
        """Score a time slot and provide reasoning."""
        score = 0.0
        reasons = []

        slot_start = slot["start"]
        slot_end = slot["end"]
        time_of_day = slot["time_of_day"]

        # 1. Check for hard conflicts (should be 0, but double-check)
        has_conflict = False
        for busy_start, busy_end, title in busy_intervals:
            if slot_start < busy_end and slot_end > busy_start:
                has_conflict = True
                reasons.append(f"❌ Conflicts with '{title}'")
                break

        if has_conflict:
            return 0.0, reasons

        reasons.append("✅ No calendar conflicts")
        score += 30.0

        # 2. Check break time before/after
        min_break_before = timedelta(hours=24)  # Large initial value
        min_break_after = timedelta(hours=24)

        for busy_start, busy_end, title in busy_intervals:
            # Time from end of previous event to start of this slot
            if busy_end <= slot_start:
                break_before = slot_start - busy_end
                min_break_before = min(min_break_before, break_before)

            # Time from end of this slot to start of next event
            if busy_start >= slot_end:
                break_after = busy_start - slot_end
                min_break_after = min(min_break_after, break_after)

        if min_break_before >= timedelta(minutes=buffer_minutes):
            reasons.append(f"✅ {int(min_break_before.total_seconds() // 60)} min break before")
            score += 15.0
        if min_break_after >= timedelta(minutes=buffer_minutes):
            reasons.append(f"✅ {int(min_break_after.total_seconds() // 60)} min break after")
            score += 15.0

        # 3. Match with user-specified times (highest priority)
        if preferred_times:
            matches_user_time = False
            for pref_time in preferred_times:
                try:
                    pref_start = datetime.strptime(pref_time["start"], "%H:%M").time()
                    pref_end = datetime.strptime(pref_time["end"], "%H:%M").time()

                    slot_time_start = slot_start.time()
                    slot_time_end = slot_end.time()

                    if pref_start <= slot_time_start < pref_end or pref_start < slot_time_end <= pref_end:
                        matches_user_time = True
                        break
                except Exception:
                    continue

            if matches_user_time:
                reasons.append("⭐ Matches user-specified time")
                score += 25.0
            else:
                reasons.append("⚠️ Outside user-specified time")
                score -= 10.0

        # 4. Match with productivity pattern
        else:
            productivity_pattern = user_prefs.get("productivity_pattern", "midday")
            if time_of_day == productivity_pattern:
                reasons.append(f"✅ Matches {productivity_pattern} preference")
                score += 20.0
            else:
                reasons.append(f"⚠️ Outside {productivity_pattern} preference")
                score -= 5.0

        # 5. Match with configured preferred study times
        if user_prefs.get("preferred_study_times"):
            matches_preferred = False
            for pref_time in user_prefs["preferred_study_times"]:
                try:
                    pref_start = datetime.strptime(pref_time["start"], "%H:%M").time()
                    pref_end = datetime.strptime(pref_time["end"], "%H:%M").time()

                    slot_time_start = slot_start.time()

                    if pref_start <= slot_time_start < pref_end:
                        matches_preferred = True
                        break
                except Exception:
                    continue

            if matches_preferred:
                reasons.append("✅ Within configured study hours")
                score += 10.0

        return score, reasons

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

    # ═══════════════════════════════════════════════════════════════════════════════
    # PHASE 0: CRITICAL TASK VISIBILITY FUNCTIONS
    # ═══════════════════════════════════════════════════════════════════════════════

    async def get_assignment_tasks(
        self,
        user_id: str,
        assignment_id: str
    ) -> Dict[str, Any]:
        """
        Get all tasks for a specific assignment.

        Args:
            user_id: User ID
            assignment_id: Assignment ID

        Returns:
            Dict with tasks list and assignment context
        """
        try:
            # Verify assignment ownership
            assignment = await self.db.get_assignment(assignment_id)
            if not assignment:
                return {"success": False, "error": "Assignment not found"}

            if assignment.get("user_id") != user_id:
                return {"success": False, "error": "Unauthorized"}

            # Get all tasks
            tasks = await self.db.get_assignment_tasks(assignment_id)

            return {
                "success": True,
                "assignment_title": assignment.get("title"),
                "assignment_id": assignment_id,
                "tasks": tasks,
                "count": len(tasks)
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def find_tasks(
        self,
        user_id: str,
        query: str,
        assignment_id: Optional[str] = None,
        status: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Search for tasks by title.

        Args:
            user_id: User ID
            query: Search term
            assignment_id: Optional assignment filter
            status: Optional status filter

        Returns:
            Dict with matching tasks
        """
        try:
            tasks = await self.db.find_tasks(
                user_id=user_id,
                query=query,
                assignment_id=assignment_id,
                status=status
            )

            return {
                "success": True,
                "query": query,
                "matches": tasks,
                "count": len(tasks)
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    # ═══════════════════════════════════════════════════════════════════════════════
    # PHASE 1: DELETE OPERATIONS
    # ═══════════════════════════════════════════════════════════════════════════════

    async def delete_task(
        self,
        user_id: str,
        task_id: str,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Delete a specific task.

        Args:
            user_id: User ID
            task_id: Task ID to delete
            reason: Optional reason for logging

        Returns:
            Dict with success status
        """
        try:
            # Get task details before deletion (for confirmation message)
            task = await self.db.get_task(task_id)
            if not task:
                return {"success": False, "error": "Task not found"}

            if task.get("user_id") != user_id:
                return {"success": False, "error": "Unauthorized"}

            task_title = task.get("title", "Unknown task")

            # Delete the task
            success = await self.db.delete_task(task_id, user_id)

            if success:
                return {
                    "success": True,
                    "message": f"Deleted task: '{task_title}'",
                    "task_id": task_id,
                    "reason": reason
                }
            else:
                return {"success": False, "error": "Failed to delete task"}

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def delete_assignment(
        self,
        user_id: str,
        assignment_id: str
    ) -> Dict[str, Any]:
        """
        Delete an assignment and all its tasks (CASCADE).

        Args:
            user_id: User ID
            assignment_id: Assignment ID to delete

        Returns:
            Dict with deletion counts
        """
        try:
            # Get assignment details before deletion
            assignment = await self.db.get_assignment(assignment_id)
            if not assignment:
                return {"success": False, "error": "Assignment not found"}

            if assignment.get("user_id") != user_id:
                return {"success": False, "error": "Unauthorized"}

            assignment_title = assignment.get("title", "Unknown assignment")

            # CASCADE DELETE
            result = await self.db.delete_assignment(assignment_id, user_id)

            if result["assignments_deleted"] > 0:
                return {
                    "success": True,
                    "message": f"Deleted assignment '{assignment_title}' and {result['tasks_deleted']} tasks",
                    "assignments_deleted": result["assignments_deleted"],
                    "tasks_deleted": result["tasks_deleted"]
                }
            else:
                return {"success": False, "error": "Failed to delete assignment"}

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def delete_tasks_by_assignment(
        self,
        user_id: str,
        assignment_id: str
    ) -> Dict[str, Any]:
        """
        Delete all tasks for an assignment (keep the assignment).

        Args:
            user_id: User ID
            assignment_id: Assignment whose tasks to delete

        Returns:
            Dict with deletion count
        """
        try:
            # Verify assignment ownership
            assignment = await self.db.get_assignment(assignment_id)
            if not assignment:
                return {"success": False, "error": "Assignment not found"}

            if assignment.get("user_id") != user_id:
                return {"success": False, "error": "Unauthorized"}

            # Delete all tasks
            count = await self.db.delete_tasks_by_assignment(assignment_id, user_id)

            # Reset total_estimated_hours on assignment
            await self.db.update_assignment(assignment_id, {"total_estimated_hours": 0})

            return {
                "success": True,
                "message": f"Deleted {count} tasks from assignment '{assignment.get('title')}'",
                "tasks_deleted": count
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    # ═══════════════════════════════════════════════════════════════════════════════
    # PHASE 2: EDIT OPERATIONS
    # ═══════════════════════════════════════════════════════════════════════════════

    async def update_task_properties(
        self,
        user_id: str,
        task_id: str,
        title: Optional[str] = None,
        description: Optional[str] = None,
        estimated_duration: Optional[int] = None,
        phase: Optional[str] = None,
        intensity: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Update task properties (not status).

        Args:
            user_id: User ID
            task_id: Task ID
            title: New title (optional)
            description: New description (optional)
            estimated_duration: New duration in minutes (optional)
            phase: New phase (optional)
            intensity: New intensity (optional)

        Returns:
            Dict with success status and updated fields
        """
        try:
            # Verify task ownership
            task = await self.db.get_task(task_id)
            if not task or task.get("user_id") != user_id:
                return {"success": False, "error": "Task not found or unauthorized"}

            # Build updates dict
            updates = {}
            if title:
                updates["title"] = title
            if description:
                updates["description"] = description
            if estimated_duration is not None:
                # Apply user's max task duration clamp
                preferences = await self.db.get_user_preferences(user_id)
                study_settings = preferences.get("studySettings", {}) if preferences else {}
                max_task_duration = study_settings.get("maxTaskDuration", 120)
                updates["estimated_duration"] = max(15, min(estimated_duration, max_task_duration))
            if phase:
                updates["phase"] = phase
            if intensity:
                updates["intensity"] = intensity

            if not updates:
                return {"success": False, "error": "No updates provided"}

            # Update task
            await self.db.update_task(task_id, updates)

            return {
                "success": True,
                "message": f"Updated task '{task.get('title')}': {', '.join(updates.keys())}",
                "updated_fields": list(updates.keys())
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def update_assignment_properties(
        self,
        user_id: str,
        assignment_id: str,
        title: Optional[str] = None,
        description: Optional[str] = None,
        due_date: Optional[str] = None,
        difficulty: Optional[str] = None,
        subject: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Update assignment properties.

        Args:
            user_id: User ID
            assignment_id: Assignment ID
            title: New title (optional)
            description: New description (optional)
            due_date: New due date ISO format (optional)
            difficulty: New difficulty (optional)
            subject: New subject (optional)

        Returns:
            Dict with success status and updated fields
        """
        try:
            # Verify assignment ownership
            assignment = await self.db.get_assignment(assignment_id)
            if not assignment or assignment.get("user_id") != user_id:
                return {"success": False, "error": "Assignment not found or unauthorized"}

            # Build updates dict
            updates = {}
            if title:
                updates["title"] = title
            if description:
                updates["description"] = description
            if due_date:
                updates["due_date"] = parser.parse(due_date)
            if difficulty:
                updates["difficulty_level"] = difficulty
            if subject:
                updates["subject"] = subject

            if not updates:
                return {"success": False, "error": "No updates provided"}

            # Update assignment
            await self.db.update_assignment(assignment_id, updates)

            return {
                "success": True,
                "message": f"Updated assignment '{assignment.get('title')}': {', '.join(updates.keys())}",
                "updated_fields": list(updates.keys())
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    # ═══════════════════════════════════════════════════════════════════════════════
    # PHASE 3: ENHANCED QUERY OPERATIONS
    # ═══════════════════════════════════════════════════════════════════════════════

    async def get_tasks_by_status(
        self,
        user_id: str,
        status: str,
        limit: int = 50
    ) -> Dict[str, Any]:
        """
        Get all tasks for user filtered by status.

        Args:
            user_id: User ID
            status: Task status to filter by
            limit: Max tasks to return

        Returns:
            Dict with tasks list
        """
        try:
            tasks = await self.db.get_tasks_by_status(user_id, status, limit)

            return {
                "success": True,
                "status": status,
                "tasks": tasks,
                "count": len(tasks)
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def get_upcoming_tasks(
        self,
        user_id: str,
        days_ahead: int
    ) -> Dict[str, Any]:
        """
        Get tasks scheduled in the next N days.

        Args:
            user_id: User ID
            days_ahead: Number of days to look ahead

        Returns:
            Dict with tasks list sorted by date
        """
        try:
            tasks = await self.db.get_upcoming_tasks(user_id, days_ahead)

            return {
                "success": True,
                "days_ahead": days_ahead,
                "tasks": tasks,
                "count": len(tasks)
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def get_all_user_tasks(
        self,
        user_id: str,
        assignment_id: Optional[str] = None,
        status_filter: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get all tasks for user with optional filters.

        Args:
            user_id: User ID
            assignment_id: Optional assignment filter
            status_filter: Optional status filter

        Returns:
            Dict with tasks list
        """
        try:
            tasks = await self.db.get_all_user_tasks(
                user_id=user_id,
                assignment_id=assignment_id,
                status_filter=status_filter
            )

            return {
                "success": True,
                "tasks": tasks,
                "count": len(tasks),
                "filters": {
                    "assignment_id": assignment_id,
                    "status": status_filter
                }
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
