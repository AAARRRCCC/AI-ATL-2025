import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    // Verify token
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Get count from database
    const db = await getDatabase();
    const tasksCollection = db.collection('subtasks');

    // Count all pending/scheduled subtasks
    // Note: scheduled_start/end times are stored in Google Calendar, not in the database
    // So we count all pending subtasks - they should have corresponding calendar events
    const count = await tasksCollection.countDocuments({
      user_id: payload.userId,
      status: { $in: ['pending', 'scheduled'] }
    });

    return NextResponse.json({ count }, { status: 200 });
  } catch (error) {
    console.error('Get tasks count error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
