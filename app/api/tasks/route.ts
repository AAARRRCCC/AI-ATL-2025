import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { ObjectId } from 'mongodb';

/**
 * GET /api/tasks
 * List all tasks for the authenticated user with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
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

    // Get database
    const db = await getDatabase();
    const subtasksCollection = db.collection('subtasks');
    const assignmentsCollection = db.collection('assignments');

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // pending, scheduled, in_progress, completed, or comma-separated
    const assignmentId = searchParams.get('assignment_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const sortBy = searchParams.get('sortBy') || 'scheduled_start'; // scheduled_start, order_index, created_at

    // Build query
    const query: any = { user_id: payload.userId };

    // Filter by status (can be comma-separated: "pending,scheduled")
    if (status && status !== 'all') {
      const statuses = status.split(',');
      if (statuses.length === 1) {
        query.status = statuses[0];
      } else {
        query.status = { $in: statuses };
      }
    }

    // Filter by assignment
    if (assignmentId && assignmentId !== 'all') {
      query.assignment_id = assignmentId;
    }

    // Filter by date range
    if (startDate || endDate) {
      query.scheduled_start = {};
      if (startDate) {
        query.scheduled_start.$gte = new Date(startDate);
      }
      if (endDate) {
        query.scheduled_start.$lte = new Date(endDate);
      }
    }

    // Sort options
    const sortOptions: any = {};
    if (sortBy === 'scheduled_start') {
      sortOptions.scheduled_start = 1; // Ascending (earliest first)
    } else if (sortBy === 'order_index') {
      sortOptions.order_index = 1; // Ascending
    } else if (sortBy === 'created_at') {
      sortOptions.created_at = -1; // Descending (newest first)
    }

    // Fetch tasks
    const tasks = await subtasksCollection
      .find(query)
      .sort(sortOptions)
      .toArray();

    // Get assignment titles for each task
    const assignmentIds = [...new Set(tasks.map((t: any) => t.assignment_id))];
    const assignments = await assignmentsCollection
      .find({ _id: { $in: assignmentIds.map((id: string) => new ObjectId(id)) } })
      .toArray();

    const assignmentMap: any = {};
    assignments.forEach((a: any) => {
      assignmentMap[a._id.toString()] = {
        title: a.title,
        subject: a.subject,
        dueDate: a.due_date
      };
    });

    // Format tasks with assignment info
    const tasksWithAssignment = tasks.map((task: any) => {
      const assignment = assignmentMap[task.assignment_id] || {};
      return {
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
        orderIndex: task.order_index,
        assignmentId: task.assignment_id,
        assignmentTitle: assignment.title,
        assignmentSubject: assignment.subject,
        assignmentDueDate: assignment.dueDate
      };
    });

    return NextResponse.json(
      {
        tasks: tasksWithAssignment,
        count: tasksWithAssignment.length
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Get tasks error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
