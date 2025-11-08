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
    const assignmentsCollection = db.collection('assignments');

    // Count active assignments (not completed)
    const count = await assignmentsCollection.countDocuments({
      user_id: payload.userId,
      status: { $ne: 'completed' }
    });

    return NextResponse.json({ count }, { status: 200 });
  } catch (error) {
    console.error('Get assignments count error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
