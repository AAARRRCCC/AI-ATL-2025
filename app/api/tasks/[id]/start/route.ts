import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { ObjectId } from 'mongodb';

/**
 * POST /api/tasks/[id]/start
 * Start a task (set status to in_progress and record start time)
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

    // Update task to in_progress
    const result = await subtasksCollection.updateOne(
      { _id: new ObjectId(id), user_id: payload.userId },
      {
        $set: {
          status: 'in_progress',
          started_at: new Date()
        }
      }
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

    return NextResponse.json(
      {
        message: 'Task started successfully',
        task: {
          id: updatedTask!._id.toString(),
          title: updatedTask!.title,
          status: updatedTask!.status,
          startedAt: updatedTask!.started_at
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Start task error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
