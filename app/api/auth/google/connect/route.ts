import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { extractTokenFromHeader, verifyToken } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { USERS_COLLECTION } from "@/models/User";
import { ObjectId } from "mongodb";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback"
);

/**
 * GET: Generate Google OAuth URL
 */
export async function GET(request: NextRequest) {
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

    // Generate OAuth URL with state containing user ID
    const scopes = [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      state: payload.userId, // Pass user ID in state for callback
      prompt: "consent", // Force consent to get refresh token
    });

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error("Google OAuth connect error:", error);
    return NextResponse.json(
      { error: "Failed to generate OAuth URL" },
      { status: 500 }
    );
  }
}
