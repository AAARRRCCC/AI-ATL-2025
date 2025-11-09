"""
SteadyStudy Backend API

FastAPI application with WebSocket support for AI chat and REST endpoints
for assignment and calendar management.
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import asyncio
from datetime import datetime

from ai.chat_handler import ChatHandler
from database.connection import Database
from services.function_executor import FunctionExecutor

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="SteadyStudy API",
    description="AI-powered study planning and scheduling API",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
db = Database()

# Initialize Gemini chat handler
chat_handler = ChatHandler(gemini_api_key=os.getenv("GEMINI_API_KEY"))


@app.on_event("startup")
async def startup_db_client():
    """Initialize database connection on startup"""
    await db.connect()


@app.on_event("shutdown")
async def shutdown_db_client():
    """Close database connection on shutdown"""
    await db.close()


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "SteadyStudy API",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    db_status = "connected" if db.is_connected() else "disconnected"

    return {
        "status": "healthy",
        "database": db_status,
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY")),
        "timestamp": datetime.utcnow().isoformat()
    }


@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    """
    WebSocket endpoint for AI chat interaction.

    Handles real-time chat with Gemini AI, including function calling
    for assignment and task management.
    """
    await websocket.accept()
    user_id = None

    try:
        # First message should contain auth token
        auth_data = await websocket.receive_json()

        # TODO: Implement proper token verification
        # For now, accept user_id directly (NOT SECURE - implement auth later)
        user_id = auth_data.get("user_id")
        auth_token = auth_data.get("token")

        if not user_id:
            await websocket.send_json({
                "error": "Unauthorized",
                "message": "Please provide user_id"
            })
            await websocket.close()
            return

        # Initialize function executor with database and auth token
        function_executor = FunctionExecutor(db, user_id, auth_token)

        # Load conversation history from database
        history = await db.get_chat_history(user_id, limit=20)

        # Note: Connection status is shown in UI header, not as a chat message
        # No need to send a "Connected" message here

        # Main chat loop
        while True:
            # Receive message
            data = await websocket.receive_json()
            user_message = data.get("message")

            if not user_message:
                continue

            # Save user message to database
            await db.save_message(user_id, "user", user_message)

            # Send typing indicator
            await websocket.send_json({
                "type": "typing",
                "message": "AI is thinking..."
            })

            # Process with Gemini AI with 2-minute timeout
            try:
                response = await asyncio.wait_for(
                    chat_handler.process_message(
                        user_message,
                        user_id,
                        history,
                        function_executor
                    ),
                    timeout=120.0  # 2 minutes
                )
            except asyncio.TimeoutError:
                await websocket.send_json({
                    "type": "error",
                    "message": "AI response timed out after 2 minutes. Please try a simpler request or break it into smaller parts."
                })
                continue

            # Save AI response to database
            await db.save_message(
                user_id,
                "model",  # Gemini uses "model" role
                response["message"],
                function_calls=response["function_calls"]
            )

            # Send response to client
            await websocket.send_json({
                "type": "message",
                "message": response["message"],
                "function_calls": response["function_calls"],
                "timestamp": datetime.utcnow().isoformat()
            })

            # Update history
            history.append({"role": "user", "content": user_message})
            history.append({"role": "model", "content": response["message"]})

    except WebSocketDisconnect:
        print(f"WebSocket disconnected for user: {user_id}")
    except Exception as e:
        print(f"WebSocket error for user {user_id}: {str(e)}")
        try:
            await websocket.send_json({
                "type": "error",
                "message": f"An error occurred: {str(e)}"
            })
        except:
            pass


# Import and include routers (to be created)
# from routes import assignments, tasks, calendar, auth
# app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
# app.include_router(assignments.router, prefix="/api/assignments", tags=["assignments"])
# app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
# app.include_router(calendar.router, prefix="/api/calendar", tags=["calendar"])


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        reload=True  # Enable auto-reload during development
    )
