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
        return await self.db.users.find_one({"_id": ObjectId(user_id)})

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
        return await self.db.user_preferences.find_one({"userId": ObjectId(user_id)})

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
        return await self.db.assignments.find_one({"_id": ObjectId(assignment_id)})

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

        # Convert ObjectId to string for JSON serialization
        for assignment in assignments:
            assignment["_id"] = str(assignment["_id"])

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
        return await self.db.subtasks.find_one({"_id": ObjectId(task_id)})

    async def get_assignment_tasks(
        self,
        assignment_id: str
    ) -> List[Dict[str, Any]]:
        """Get all tasks for an assignment"""
        tasks = await self.db.subtasks.find(
            {"assignment_id": assignment_id}
        ).sort("order_index", 1).to_list(length=100)

        # Convert ObjectId to string
        for task in tasks:
            task["_id"] = str(task["_id"])

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
