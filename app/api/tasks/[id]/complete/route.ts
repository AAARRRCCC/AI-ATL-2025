import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { ObjectId } from 'mongodb';

/**
 * POST /api/tasks/[id]/complete
 * Mark a task as completed and optionally record actual duration
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Extract and verify token
    const authHeader = request.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid task ID' },
        { status: 400 }
      );
    }

    // Parse request body (optional actual duration)
    const body = await request.json().catch(() => ({}));
    const actualDuration = body.actualDuration; // Optional: actual time spent in minutes

    // Get database
    const db = await getDatabase();
    const subtasksCollection = db.collection('subtasks');

    // Find the task first
    const task = await subtasksCollection.findOne({
      _id: new ObjectId(id),
      user_id: payload.userId
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Check if task is already completed
    if (task.status === 'completed') {
      return NextResponse.json(
        { error: 'Task is already completed' },
        { status: 400 }
      );
    }

    // Calculate actual duration if not provided
    let finalActualDuration = actualDuration;
    if (!finalActualDuration && task.started_at) {
      // Calculate from start time
      const startTime = new Date(task.started_at);
      const endTime = new Date();
      finalActualDuration = Math.round((endTime.getTime() - startTime.getTime()) / 60000); // Convert ms to minutes
    }

    // Update task to completed
    const updates: any = {
      status: 'completed',
      completed_at: new Date()
    };

    if (finalActualDuration) {
      updates.actual_duration = finalActualDuration;
    }

    const result = await subtasksCollection.updateOne(
      { _id: new ObjectId(id), user_id: payload.userId },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Get updated task
    const updatedTask = await subtasksCollection.findOne({
      _id: new ObjectId(id)
    });

    // Calculate time variance for progress analysis
    const estimatedDuration = task.estimated_duration || 0;
    const timeVariance = finalActualDuration && estimatedDuration
      ? Math.round(((finalActualDuration - estimatedDuration) / estimatedDuration) * 100)
      : 0;

    return NextResponse.json(
      {
        message: 'Task completed successfully',
        task: {
          id: updatedTask!._id.toString(),
          title: updatedTask!.title,
          status: updatedTask!.status,
          completedAt: updatedTask!.completed_at,
          estimatedDuration,
          actualDuration: finalActualDuration,
          timeVariance, // Positive means took longer, negative means faster
          performanceNote:
            timeVariance < -20 ? 'Great! Completed faster than expected'
            : timeVariance > 20 ? 'Took longer than expected - consider adjusting future estimates'
            : 'Completed close to estimate'
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Complete task error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
