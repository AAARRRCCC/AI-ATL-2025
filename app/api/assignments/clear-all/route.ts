import { NextRequest, NextResponse } from "next/server";
import { extractTokenFromHeader, verifyToken } from "@/lib/auth";
import { getDatabase } from "@/lib/mongodb";

/**
 * DELETE: Clear all assignments, tasks, and calendar events for the authenticated user
 * Useful for testing - completely resets the user's data
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify user is authenticated
    const authHeader = request.headers.get("authorization");
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const db = await getDatabase();

    // Delete all assignments
    const assignmentsResult = await db.collection("assignments").deleteMany({
      user_id: payload.userId,
    });

    // Delete all tasks
    const tasksResult = await db.collection("tasks").deleteMany({
      user_id: payload.userId,
    });

    // Delete all messages (chat history)
    const messagesResult = await db.collection("messages").deleteMany({
      user_id: payload.userId,
    });

    return NextResponse.json({
      success: true,
      deleted: {
        assignments: assignmentsResult.deletedCount,
        tasks: tasksResult.deletedCount,
        messages: messagesResult.deletedCount,
      },
      message: `Cleared ${assignmentsResult.deletedCount} assignments, ${tasksResult.deletedCount} tasks, and ${messagesResult.deletedCount} messages`,
    });
  } catch (error: any) {
    console.error("Clear all data error:", error.message);
    return NextResponse.json(
      { error: "Failed to clear data" },
      { status: 500 }
    );
  }
}
