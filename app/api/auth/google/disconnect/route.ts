import { NextRequest, NextResponse } from "next/server";
import { extractTokenFromHeader, verifyToken } from "@/lib/auth";
import { getDatabase } from "@/lib/mongodb";
import { USERS_COLLECTION } from "@/models/User";
import { ObjectId } from "mongodb";

/**
 * POST: Disconnect Google Calendar from user account
 * Removes all Google OAuth tokens from the user's record
 */
export async function POST(request: NextRequest) {
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

    // Remove Google OAuth tokens from user record
    const db = await getDatabase();
    const usersCollection = db.collection(USERS_COLLECTION);

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(payload.userId) },
      {
        $unset: {
          googleAccessToken: "",
          googleRefreshToken: "",
          googleTokenExpiry: "",
        },
        $set: {
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Google Calendar disconnected successfully",
    });
  } catch (error) {
    console.error("Google Calendar disconnect error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect Google Calendar" },
      { status: 500 }
    );
  }
}
