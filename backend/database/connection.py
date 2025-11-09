"""
MongoDB Database Connection and Operations

Handles connection to MongoDB Atlas and provides methods for
database operations.
"""

from motor.motor_asyncio import AsyncIOMotorClient
from typing import List, Dict, Any, Optional
import os
from datetime import datetime
from bson import ObjectId


def serialize_document(doc: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert MongoDB document to JSON-serializable format.
    Converts ObjectId to string and datetime to ISO format.
    """
    if not doc:
        return doc

    for key, value in doc.items():
        if isinstance(value, ObjectId):
            doc[key] = str(value)
        elif isinstance(value, datetime):
            doc[key] = value.isoformat()
        elif isinstance(value, dict):
            doc[key] = serialize_document(value)
        elif isinstance(value, list):
            doc[key] = [serialize_document(item) if isinstance(item, dict) else item for item in value]

    return doc


class Database:
    """
    MongoDB database connection and operations handler.
    """

    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.db = None

    async def connect(self):
        """Connect to MongoDB Atlas"""
        mongodb_uri = os.getenv("MONGODB_URI")

        if not mongodb_uri:
            raise ValueError("MONGODB_URI environment variable is not set")

        self.client = AsyncIOMotorClient(mongodb_uri)
        # Use hyphen to match frontend database name
        self.db = self.client["study-autopilot"]

        # Test the connection
        await self.client.admin.command('ping')
        print("Successfully connected to MongoDB!")

    async def close(self):
        """Close database connection"""
        if self.client:
            self.client.close()
            print("MongoDB connection closed")

    def is_connected(self) -> bool:
        """Check if database is connected"""
        return self.client is not None and self.db is not None

    # ==================== CHAT HISTORY ====================

    async def get_chat_history(
        self,
        user_id: str,
        limit: int = 20
    ) -> List[Dict[str, str]]:
        """
        Get chat history for a user.

        Args:
            user_id: User's ID
            limit: Maximum number of messages to retrieve

        Returns:
            List of messages in format [{"role": "user", "content": "..."}, ...]
        """
        messages = await self.db.chat_messages.find(
            {"user_id": user_id}
        ).sort("timestamp", -1).limit(limit).to_list(length=limit)

        # Reverse to get chronological order
        messages.reverse()

        # Convert to Gemini format
        return [
            {
                "role": msg["role"],
                "content": self._build_content_with_attachments(msg)
            }
            for msg in messages
        ]

    def _build_content_with_attachments(self, msg: Dict[str, Any]) -> str:
        """Append attachment context to message content for AI history."""
        content = msg.get("content", "")
        attachments = msg.get("attachments") or []
        if not attachments:
            return content

        attachment_descriptions = []
        for attachment in attachments:
            filename = attachment.get("filename", "attachment")
            attachment_text = attachment.get("extracted_text") or attachment.get("preview")
            if attachment_text:
                attachment_descriptions.append(
                    f"[Attachment: {filename}]\n{attachment_text}"
                )

        if attachment_descriptions:
            if content:
                content = f"{content}\n\n" + "\n\n".join(attachment_descriptions)
            else:
                content = "\n\n".join(attachment_descriptions)

        return content

    async def save_message(
        self,
        user_id: str,
        role: str,
        content: str,
        function_calls: Optional[List[Dict]] = None,
        attachments: Optional[List[Dict[str, Any]]] = None
    ):
        """
        Save a chat message to the database.

        Args:
            user_id: User's ID
            role: "user" or "model"
            content: Message content
            function_calls: Optional list of function calls made
        """
        message = {
            "user_id": user_id,
            "role": role,
            "content": content,
            "timestamp": datetime.utcnow(),
        }

        if function_calls:
            message["function_calls"] = function_calls

        if attachments:
            message["attachments"] = attachments

        await self.db.chat_messages.insert_one(message)

    # ==================== USER OPERATIONS ====================

    async def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        user = await self.db.users.find_one({"_id": ObjectId(user_id)})
        if user:
            serialize_document(user)
        return user

    async def create_user(self, user_data: Dict[str, Any]) -> str:
        """Create a new user"""
        user_data["created_at"] = datetime.utcnow()
        user_data["last_login"] = datetime.utcnow()

        result = await self.db.users.insert_one(user_data)
        return str(result.inserted_id)

    async def update_user(self, user_id: str, updates: Dict[str, Any]):
        """Update user data"""
        await self.db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": updates}
        )

    # ==================== USER PREFERENCES OPERATIONS ====================

    async def get_user_preferences(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get user preferences by user ID.

        Args:
            user_id: User's ID

        Returns:
            User preferences document or None if not found
        """
        prefs = await self.db.user_preferences.find_one({"userId": ObjectId(user_id)})
        if prefs:
            serialize_document(prefs)
        return prefs

    async def update_user_preferences(
        self,
        user_id: str,
        updates: Dict[str, Any]
    ):
        """
        Update user preferences.

        Args:
            user_id: User's ID
            updates: Dictionary of fields to update

        Note:
            Creates preferences document if it doesn't exist (upsert)
        """
        await self.db.user_preferences.update_one(
            {"userId": ObjectId(user_id)},
            {"$set": updates},
            upsert=True
        )

    async def get_user_timezone(self, user_id: str) -> Optional[str]:
        """
        Get user's timezone setting.

        Args:
            user_id: User's ID

        Returns:
            IANA timezone string (e.g., "America/New_York") or None if not set
        """
        prefs = await self.get_user_preferences(user_id)
        if prefs and "timezone" in prefs:
            return prefs["timezone"]
        return None

    async def set_user_timezone(self, user_id: str, timezone: str):
        """
        Set user's timezone preference.

        Args:
            user_id: User's ID
            timezone: IANA timezone string (e.g., "America/New_York")
        """
        await self.update_user_preferences(user_id, {"timezone": timezone})

    # ==================== ASSIGNMENT OPERATIONS ====================

    async def create_assignment(
        self,
        user_id: str,
        assignment_data: Dict[str, Any]
    ) -> str:
        """Create a new assignment"""
        assignment = {
            **assignment_data,
            "user_id": user_id,
            "status": "not_started",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": "ai_chat"
        }

        result = await self.db.assignments.insert_one(assignment)
        return str(result.inserted_id)

    async def get_assignment(self, assignment_id: str) -> Optional[Dict[str, Any]]:
        """Get assignment by ID"""
        assignment = await self.db.assignments.find_one({"_id": ObjectId(assignment_id)})
        if assignment:
            serialize_document(assignment)
        return assignment

    async def get_user_assignments(
        self,
        user_id: str,
        status_filter: str = "all"
    ) -> List[Dict[str, Any]]:
        """Get all assignments for a user"""
        query = {"user_id": user_id}

        if status_filter != "all":
            query["status"] = status_filter

        assignments = await self.db.assignments.find(query).to_list(length=100)

        # Convert ObjectId and datetime to strings for JSON serialization
        for assignment in assignments:
            serialize_document(assignment)

        return assignments

    async def update_assignment(
        self,
        assignment_id: str,
        updates: Dict[str, Any]
    ):
        """Update assignment"""
        updates["updated_at"] = datetime.utcnow()

        await self.db.assignments.update_one(
            {"_id": ObjectId(assignment_id)},
            {"$set": updates}
        )

    # ==================== TASK OPERATIONS ====================

    async def create_task(
        self,
        user_id: str,
        assignment_id: str,
        task_data: Dict[str, Any]
    ) -> str:
        """Create a new subtask"""
        task = {
            **task_data,
            "user_id": user_id,
            "assignment_id": assignment_id,
            "status": "pending",
            "created_at": datetime.utcnow()
        }

        result = await self.db.subtasks.insert_one(task)
        return str(result.inserted_id)

    async def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get task by ID"""
        task = await self.db.subtasks.find_one({"_id": ObjectId(task_id)})
        if task:
            serialize_document(task)
        return task

    async def get_assignment_tasks(
        self,
        assignment_id: str
    ) -> List[Dict[str, Any]]:
        """Get all tasks for an assignment"""
        tasks = await self.db.subtasks.find(
            {"assignment_id": assignment_id}
        ).sort("order_index", 1).to_list(length=100)

        # Convert ObjectId and datetime to strings
        for task in tasks:
            serialize_document(task)

        return tasks

    async def update_task(
        self,
        task_id: str,
        updates: Dict[str, Any]
    ):
        """Update task"""
        await self.db.subtasks.update_one(
            {"_id": ObjectId(task_id)},
            {"$set": updates}
        )

    async def delete_task(self, task_id: str, user_id: str) -> bool:
        """
        Delete a task by ID with authorization check.

        Args:
            task_id: Task ID to delete
            user_id: User ID for authorization

        Returns:
            True if deleted, False if not found or unauthorized
        """
        # Verify ownership first
        task = await self.get_task(task_id)
        if not task or task.get("user_id") != user_id:
            return False

        result = await self.db.subtasks.delete_one({
            "_id": ObjectId(task_id),
            "user_id": user_id  # Double-check authorization
        })
        return result.deleted_count > 0

    async def delete_assignment(self, assignment_id: str, user_id: str) -> Dict[str, int]:
        """
        Delete an assignment and all its tasks (CASCADE DELETE).

        Args:
            assignment_id: Assignment ID to delete
            user_id: User ID for authorization

        Returns:
            Dict with counts: {"assignments_deleted": 1, "tasks_deleted": N}
        """
        # Verify ownership first
        assignment = await self.get_assignment(assignment_id)
        if not assignment or assignment.get("user_id") != user_id:
            return {"assignments_deleted": 0, "tasks_deleted": 0}

        # Delete all tasks first
        tasks_result = await self.db.subtasks.delete_many({
            "assignment_id": assignment_id,
            "user_id": user_id
        })

        # Delete assignment
        assignment_result = await self.db.assignments.delete_one({
            "_id": ObjectId(assignment_id),
            "user_id": user_id
        })

        return {
            "assignments_deleted": assignment_result.deleted_count,
            "tasks_deleted": tasks_result.deleted_count
        }

    async def delete_tasks_by_assignment(self, assignment_id: str, user_id: str) -> int:
        """
        Delete all tasks for an assignment without deleting the assignment itself.

        Args:
            assignment_id: Assignment whose tasks should be deleted
            user_id: User ID for authorization

        Returns:
            Number of tasks deleted
        """
        # Verify assignment ownership
        assignment = await self.get_assignment(assignment_id)
        if not assignment or assignment.get("user_id") != user_id:
            return 0

        result = await self.db.subtasks.delete_many({
            "assignment_id": assignment_id,
            "user_id": user_id
        })
        return result.deleted_count

    async def find_tasks(
        self,
        user_id: str,
        query: str,
        assignment_id: Optional[str] = None,
        status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Find tasks by title search with optional filters.

        Args:
            user_id: User ID
            query: Search term (case-insensitive partial match)
            assignment_id: Optional assignment filter
            status: Optional status filter

        Returns:
            List of matching tasks with IDs converted to strings
        """
        filters = {"user_id": user_id}

        # Add title search (case-insensitive regex)
        if query:
            filters["title"] = {"$regex": query, "$options": "i"}

        # Add optional filters
        if assignment_id:
            filters["assignment_id"] = assignment_id
        if status:
            filters["status"] = status

        tasks = await self.db.subtasks.find(filters).sort("created_at", -1).to_list(length=100)

        # Convert ObjectIds and datetime to strings
        for task in tasks:
            serialize_document(task)

        return tasks

    async def get_tasks_by_status(
        self,
        user_id: str,
        status: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get all tasks for a user filtered by status across all assignments.

        Args:
            user_id: User ID
            status: Task status to filter by
            limit: Maximum number of tasks to return

        Returns:
            List of tasks with assignment context
        """
        tasks = await self.db.subtasks.find({
            "user_id": user_id,
            "status": status
        }).sort("created_at", -1).to_list(length=limit)

        # Convert ObjectIds/datetime and add assignment info
        for task in tasks:
            serialize_document(task)

            # Fetch assignment details for context
            if task.get("assignment_id"):
                assignment = await self.get_assignment(task["assignment_id"])
                if assignment:
                    task["assignment_title"] = assignment.get("title", "Unknown")
                    task["assignment_subject"] = assignment.get("subject", "")

        return tasks

    async def get_upcoming_tasks(
        self,
        user_id: str,
        days_ahead: int
    ) -> List[Dict[str, Any]]:
        """
        Get tasks scheduled in the next N days.

        Args:
            user_id: User ID
            days_ahead: Number of days to look ahead

        Returns:
            List of tasks sorted by scheduled_start
        """
        from datetime import timedelta

        now = datetime.utcnow()
        future = now + timedelta(days=days_ahead)

        tasks = await self.db.subtasks.find({
            "user_id": user_id,
            "scheduled_start": {
                "$gte": now,
                "$lte": future
            }
        }).sort("scheduled_start", 1).to_list(length=100)

        # Convert ObjectIds/datetime and add assignment context
        for task in tasks:
            serialize_document(task)

            if task.get("assignment_id"):
                assignment = await self.get_assignment(task["assignment_id"])
                if assignment:
                    task["assignment_title"] = assignment.get("title", "Unknown")

        return tasks

    async def get_all_user_tasks(
        self,
        user_id: str,
        assignment_id: Optional[str] = None,
        status_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get ALL tasks for a user with optional filters.

        Args:
            user_id: User ID
            assignment_id: Optional assignment filter
            status_filter: Optional status filter ('all', 'pending', 'completed', etc.)

        Returns:
            List of all tasks with assignment context
        """
        filters = {"user_id": user_id}

        if assignment_id:
            filters["assignment_id"] = assignment_id

        if status_filter and status_filter != "all":
            filters["status"] = status_filter

        tasks = await self.db.subtasks.find(filters).sort("created_at", -1).to_list(length=500)

        # Convert ObjectIds/datetime and add assignment context
        for task in tasks:
            serialize_document(task)

            if task.get("assignment_id"):
                assignment = await self.get_assignment(task["assignment_id"])
                if assignment:
                    task["assignment_title"] = assignment.get("title", "Unknown")
                    task["assignment_due_date"] = assignment.get("due_date")

        return tasks
