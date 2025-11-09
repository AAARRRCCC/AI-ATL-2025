import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { ObjectId } from 'mongodb';

/**
 * GET /api/assignments/[id]
 * Get a single assignment with all its subtasks
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
        { error: 'Invalid assignment ID' },
        { status: 400 }
      );
    }

    // Get database
    const db = await getDatabase();
    const assignmentsCollection = db.collection('assignments');
    const subtasksCollection = db.collection('subtasks');

    // Find assignment
    const assignment = await assignmentsCollection.findOne({
      _id: new ObjectId(id),
      user_id: payload.userId
    });

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // Get all subtasks for this assignment
    const subtasks = await subtasksCollection
      .find({ assignment_id: id })
      .sort({ order_index: 1 })
      .toArray();

    // Calculate progress metrics
    const totalTasks = subtasks.length;
    const completedTasks = subtasks.filter((t: any) => t.status === 'completed').length;
    const inProgressTasks = subtasks.filter((t: any) => t.status === 'in_progress').length;
    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Group tasks by phase
    const phases: any = {};
    subtasks.forEach((task: any) => {
      const phase = task.phase || 'Other';
      if (!phases[phase]) {
        phases[phase] = {
          name: phase,
          tasks: [],
          totalDuration: 0,
          completedDuration: 0,
          progress: 0
        };
      }
      phases[phase].tasks.push({
        id: task._id.toString(),
        title: task.title,
        description: task.description,
        estimatedDuration: task.estimated_duration,
        actualDuration: task.actual_duration,
        status: task.status,
        scheduledStart: task.scheduled_start,
        scheduledEnd: task.scheduled_end,
        completedAt: task.completed_at,
        orderIndex: task.order_index
      });
      phases[phase].totalDuration += task.estimated_duration || 0;
      if (task.status === 'completed') {
        phases[phase].completedDuration += task.actual_duration || task.estimated_duration || 0;
      }
    });

    // Calculate phase progress
    Object.values(phases).forEach((phase: any) => {
      const phaseCompletedTasks = phase.tasks.filter((t: any) => t.status === 'completed').length;
      phase.progress = phase.tasks.length > 0
        ? Math.round((phaseCompletedTasks / phase.tasks.length) * 100)
        : 0;
    });

    // Format response
    const response = {
      id: assignment._id.toString(),
      title: assignment.title,
      description: assignment.description,
      subject: assignment.subject,
      dueDate: assignment.due_date,
      difficultyLevel: assignment.difficulty_level,
      status: assignment.status,
      totalEstimatedHours: assignment.total_estimated_hours,
      createdAt: assignment.created_at,
      progress: progressPercentage,
      taskCount: totalTasks,
      completedTaskCount: completedTasks,
      inProgressTaskCount: inProgressTasks,
      phases: Object.values(phases),
      tasks: subtasks.map((task: any) => ({
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
        orderIndex: task.order_index
      }))
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Get assignment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/assignments/[id]
 * Update an assignment
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
        { error: 'Invalid assignment ID' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const updates: any = {};

    // Allow updating specific fields
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.dueDate !== undefined) updates.due_date = new Date(body.dueDate);
    if (body.subject !== undefined) updates.subject = body.subject;
    if (body.difficultyLevel !== undefined) updates.difficulty_level = body.difficultyLevel;
    if (body.status !== undefined) updates.status = body.status;
    if (body.totalEstimatedHours !== undefined) updates.total_estimated_hours = body.totalEstimatedHours;

    // Get database
    const db = await getDatabase();
    const assignmentsCollection = db.collection('assignments');

    // Update assignment
    const result = await assignmentsCollection.updateOne(
      { _id: new ObjectId(id), user_id: payload.userId },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Assignment updated successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Update assignment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/assignments/[id]
 * Delete an assignment and all its subtasks
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
        { error: 'Invalid assignment ID' },
        { status: 400 }
      );
    }

    // Get database
    const db = await getDatabase();
    const assignmentsCollection = db.collection('assignments');
    const subtasksCollection = db.collection('subtasks');

    // First, verify assignment belongs to user
    const assignment = await assignmentsCollection.findOne({
      _id: new ObjectId(id),
      user_id: payload.userId
    });

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // Delete all subtasks for this assignment
    const deletedTasksResult = await subtasksCollection.deleteMany({
      assignment_id: id
    });

    // Delete the assignment itself
    await assignmentsCollection.deleteOne({
      _id: new ObjectId(id)
    });

    // TODO: Also delete associated Google Calendar events
    // This would require fetching tasks, getting their calendar event IDs,
    // and calling the calendar delete API for each

    return NextResponse.json(
      {
        message: 'Assignment and all tasks deleted successfully',
        deletedTaskCount: deletedTasksResult.deletedCount
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Delete assignment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
