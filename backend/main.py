"""
SteadyStudy Backend API

FastAPI application with WebSocket support for AI chat and REST endpoints
for assignment and calendar management.
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from datetime import datetime
from pypdf import PdfReader
import io
import asyncio

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
            user_message = data.get("message") or ""
            attachments = data.get("attachments") or []

            if not user_message and not attachments:
                continue

            # Save user message to database with attachments if provided
            await db.save_message(user_id, "user", user_message, attachments=attachments or None)

            augmented_message = user_message
            if attachments:
                attachment_descriptions = []
                for attachment in attachments:
                    filename = attachment.get("filename", "attachment")
                    attachment_text = attachment.get("extracted_text") or attachment.get("preview")
                    if attachment_text:
                        attachment_descriptions.append(
                            f"[Attachment: {filename}]\n{attachment_text}"
                        )
                if attachment_descriptions:
                    if augmented_message:
                        augmented_message += "\n\n"
                    augmented_message += "\n\n".join(attachment_descriptions)

            # Send typing indicator
            await websocket.send_json({
                "type": "typing",
                "message": "AI is thinking..."
            })

            # Process with Gemini AI with 2-minute timeout
            try:
                response = await asyncio.wait_for(
                    chat_handler.process_message(
                        augmented_message,
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
            history.append({"role": "user", "content": augmented_message})
            history.append({"role": "model", "content": response["message"]})

    except WebSocketDisconnect:
        print(f"WebSocket disconnected for user: {user_id}")
    except Exception as e:
        import traceback
        print(f"WebSocket error for user {user_id}: {str(e)}")
        print("Full traceback:")
        traceback.print_exc()
        try:
            await websocket.send_json({
                "type": "error",
                "message": f"An error occurred: {str(e)}"
            })
        except:
            pass


@app.post("/chat/upload-pdf")
async def upload_assignment_pdf(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    token: str = Form(None)
):
    """
    Accept assignment PDFs, extract text, and store them as chat attachments.
    """
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF uploads are supported")

    file_bytes = await file.read()
    max_file_size = int(os.getenv("PDF_MAX_BYTES", 10 * 1024 * 1024))  # 10 MB default
    if len(file_bytes) > max_file_size:
        raise HTTPException(
            status_code=400,
            detail=f"File is too large. Maximum size is {max_file_size // (1024 * 1024)} MB"
        )

    try:
        reader = PdfReader(io.BytesIO(file_bytes))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to read PDF: {str(exc)}")

    extracted_text = []
    for page in reader.pages:
        page_text = page.extract_text() or ""
        extracted_text.append(page_text.strip())

    full_text = "\n\n".join(filter(None, extracted_text)).strip()

    if not full_text:
        raise HTTPException(status_code=400, detail="Unable to extract text from PDF")

    char_limit = int(os.getenv("PDF_TEXT_CHAR_LIMIT", 6000))
    truncated_text = full_text[:char_limit]
    if len(full_text) > char_limit:
        truncated_text += "\n\n[Text truncated for processing]"

    pages = len(reader.pages)
    size_kb = round(len(file_bytes) / 1024, 1)

    preview_limit = int(os.getenv("PDF_PREVIEW_CHAR_LIMIT", 350))
    preview_text = truncated_text[:preview_limit].strip()
    if len(truncated_text) > preview_limit:
        preview_text += "…"

    attachment = {
        "type": "pdf",
        "filename": file.filename,
        "pages": pages,
        "size_kb": size_kb,
        "preview": preview_text,
        "extracted_text": truncated_text
    }

    return {
        "success": True,
        "attachment": attachment
    }


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
