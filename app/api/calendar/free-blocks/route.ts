import { NextRequest, NextResponse } from "next/server";
import { extractTokenFromHeader, verifyToken } from "@/lib/auth";
import { findFreeTimeBlocks } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  try {
    // Authenticate with JWT
    const authHeader = request.headers.get("authorization");
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const minDuration = searchParams.get("minDuration");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 }
      );
    }

    const freeBlocks = await findFreeTimeBlocks(
      payload.userId,
      new Date(startDate),
      new Date(endDate),
      minDuration ? parseInt(minDuration) : 45
    );

    return NextResponse.json({ freeBlocks });
  } catch (error) {
    console.error("Free blocks error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to find free time blocks";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
