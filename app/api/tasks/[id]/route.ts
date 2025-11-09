import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { ObjectId } from 'mongodb';

/**
 * GET /api/tasks/[id]
 * Get a single task with full details
 */
export async function GET(
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
    const assignmentsCollection = db.collection('assignments');

    // Find task
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

    // Get assignment details
    const assignment = await assignmentsCollection.findOne({
      _id: new ObjectId(task.assignment_id)
    });

    // Format response
    const response = {
      id: task._id.toString(),
      title: task.title,
      description: task.description,
      phase: task.phase,
      estimatedDuration: task.estimated_duration,
      actualDuration: task.actual_duration,
      status: task.status,
      scheduledStart: task.scheduled_start,
      scheduledEnd: task.scheduled_end,
      completedAt: task.completed_at,
      startedAt: task.started_at,
      orderIndex: task.order_index,
      assignmentId: task.assignment_id,
      assignment: assignment ? {
        id: assignment._id.toString(),
        title: assignment.title,
        subject: assignment.subject,
        dueDate: assignment.due_date,
        difficultyLevel: assignment.difficulty_level
      } : null
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Get task error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/tasks/[id]
 * Update a task
 */
export async function PUT(
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

    // Parse request body
    const body = await request.json();
    const updates: any = {};

    // Allow updating specific fields
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.phase !== undefined) updates.phase = body.phase;
    if (body.estimatedDuration !== undefined) updates.estimated_duration = body.estimatedDuration;
    if (body.actualDuration !== undefined) updates.actual_duration = body.actualDuration;
    if (body.status !== undefined) {
      updates.status = body.status;
      if (body.status === 'completed') {
        updates.completed_at = new Date();
      } else if (body.status === 'in_progress') {
        updates.started_at = new Date();
      }
    }
    if (body.scheduledStart !== undefined) updates.scheduled_start = new Date(body.scheduledStart);
    if (body.scheduledEnd !== undefined) updates.scheduled_end = new Date(body.scheduledEnd);
    if (body.orderIndex !== undefined) updates.order_index = body.orderIndex;

    // Get database
    const db = await getDatabase();
    const subtasksCollection = db.collection('subtasks');

    // Update task
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

    // TODO: If scheduled times changed, update Google Calendar event

    return NextResponse.json(
      { message: 'Task updated successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tasks/[id]
 * Delete a task
 */
export async function DELETE(
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

    // Delete task
    const result = await subtasksCollection.deleteOne({
      _id: new ObjectId(id),
      user_id: payload.userId
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // TODO: Delete associated Google Calendar event

    return NextResponse.json(
      { message: 'Task deleted successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
