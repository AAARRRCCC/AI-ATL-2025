import { NextRequest, NextResponse } from "next/server";
import { extractTokenFromHeader, verifyToken } from "@/lib/auth";
import { MongoClient } from 'mongodb';

/**
 * DEBUG: Find which database the user is in
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const uri = process.env.MONGODB_URI!;
    const client = new MongoClient(uri);
    await client.connect();

    const results: any = {};

    // Check study_autopilot (underscore)
    const db1 = client.db('study_autopilot');
    const users1 = await db1.collection('users').find({}).toArray();
    results.study_autopilot_underscore = {
      total_users: users1.length,
      user_ids: users1.map(u => u._id.toString()),
      has_current_user: users1.some(u => u._id.toString() === payload.userId)
    };

    // Check study-autopilot (hyphen)
    const db2 = client.db('study-autopilot');
    const users2 = await db2.collection('users').find({}).toArray();
    results.study_autopilot_hyphen = {
      total_users: users2.length,
      user_ids: users2.map(u => u._id.toString()),
      has_current_user: users2.some(u => u._id.toString() === payload.userId)
    };

    await client.close();

    console.log("\n" + "=".repeat(80));
    console.log("USER DATABASE CHECK:");
    console.log("Looking for user:", payload.userId);
    console.log("study_autopilot (underscore):", results.study_autopilot_underscore);
    console.log("study-autopilot (hyphen):", results.study_autopilot_hyphen);
    console.log("=".repeat(80) + "\n");

    return NextResponse.json({
      success: true,
      looking_for: payload.userId,
      results
    });

  } catch (error: any) {
    console.error("Find user error:", error.message);
    return NextResponse.json(
      { error: "Failed to find user" },
      { status: 500 }
    );
  }
}
