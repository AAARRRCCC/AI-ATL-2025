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
        Schedule tasks for an assignment.

        This is a placeholder - full implementation requires Google Calendar API.

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

            if not assignment:
                return {"success": False, "error": "Assignment not found"}

            # Create a schedule for the tasks
            scheduled_tasks = []

            start = datetime.now() if not start_date else parser.parse(start_date)
            current_time = start

            for task in tasks:
                duration_minutes = task["estimated_duration"]

                scheduled_tasks.append({
                    "task_id": str(task["_id"]),
                    "title": task["title"],
                    "scheduled_start": current_time.isoformat(),
                    "scheduled_end": (current_time + timedelta(minutes=duration_minutes)).isoformat(),
                    "duration_minutes": duration_minutes,
                    "description": task.get("description", "")
                })

                # Move to next day for next task (simplified scheduling)
                current_time += timedelta(days=1)

            # Call Next.js API to create Google Calendar events
            calendar_result = None
            if self.auth_token:
                try:
                    async with httpx.AsyncClient() as client:
                        response = await client.post(
                            f"{self.api_base_url}/api/calendar/create-events",
                            json={"tasks": scheduled_tasks},
                            headers={"Authorization": f"Bearer {self.auth_token}"},
                            timeout=30.0
                        )

                        if response.status_code == 200:
                            calendar_result = response.json()
                        else:
                            print(f"Calendar API error: {response.status_code} - {response.text}")
                except Exception as e:
                    print(f"Failed to create calendar events: {e}")

            return {
                "success": True,
                "scheduled_tasks": scheduled_tasks,
                "calendar_events": calendar_result.get("created_events", []) if calendar_result else [],
                "message": f"Scheduled {len(scheduled_tasks)} tasks and created {len(calendar_result.get('created_events', [])) if calendar_result else 0} calendar events"
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
        Get calendar events (placeholder).

        TODO: Implement Google Calendar API integration.

        Args:
            user_id: User ID
            start_date: Start date
            end_date: End date

        Returns:
            Dict with calendar events
        """
        return {
            "success": True,
            "events": [],
            "message": "Calendar integration coming soon"
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
