import { NextRequest, NextResponse } from "next/server";
import { extractTokenFromHeader, verifyToken } from "@/lib/auth";
import { getDatabase } from "@/lib/mongodb";

/**
 * DELETE: Clear all chat history for the authenticated user
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
    const messagesCollection = db.collection("messages");

    // Delete all messages for this user
    const result = await messagesCollection.deleteMany({
      user_id: payload.userId,
    });

    return NextResponse.json({
      success: true,
      deleted_count: result.deletedCount,
      message: `Cleared ${result.deletedCount} messages`,
    });
  } catch (error: any) {
    console.error("Clear chat history error:", error.message);
    return NextResponse.json(
      { error: "Failed to clear chat history" },
      { status: 500 }
    );
  }
}
