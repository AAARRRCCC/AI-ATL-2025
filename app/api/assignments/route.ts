import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { ObjectId } from 'mongodb';

/**
 * GET /api/assignments
 * List all assignments for the authenticated user with optional filtering
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
    const assignmentsCollection = db.collection('assignments');
    const subtasksCollection = db.collection('subtasks');

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // active, completed, overdue, all
    const subject = searchParams.get('subject');
    const sortBy = searchParams.get('sortBy') || 'due_date'; // due_date, created_at, title

    // Build query
    const query: any = { user_id: payload.userId };

    // Filter by status
    if (status && status !== 'all') {
      if (status === 'overdue') {
        query.status = { $ne: 'completed' };
        query.due_date = { $lt: new Date() };
      } else {
        query.status = status;
      }
    }

    // Filter by subject
    if (subject && subject !== 'all') {
      query.subject = subject;
    }

    // Sort options
    const sortOptions: any = {};
    if (sortBy === 'due_date') {
      sortOptions.due_date = 1; // Ascending (earliest first)
    } else if (sortBy === 'created_at') {
      sortOptions.created_at = -1; // Descending (newest first)
    } else if (sortBy === 'title') {
      sortOptions.title = 1; // Ascending (alphabetical)
    }

    // Fetch assignments
    const assignments = await assignmentsCollection
      .find(query)
      .sort(sortOptions)
      .toArray();

    // For each assignment, calculate progress
    const assignmentsWithProgress = await Promise.all(
      assignments.map(async (assignment) => {
        const tasks = await subtasksCollection
          .find({ assignment_id: assignment._id.toString() })
          .toArray();

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter((t: any) => t.status === 'completed').length;
        const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return {
          id: assignment._id.toString(),
          title: assignment.title,
          description: assignment.description,
          subject: assignment.subject,
          dueDate: assignment.due_date,
          difficultyLevel: assignment.difficulty_level,
          status: assignment.status,
          totalEstimatedHours: assignment.total_estimated_hours,
          createdAt: assignment.created_at,
          taskCount: totalTasks,
          completedTaskCount: completedTasks,
          progress: progressPercentage
        };
      })
    );

    return NextResponse.json(
      {
        assignments: assignmentsWithProgress,
        count: assignmentsWithProgress.length
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Get assignments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/assignments
 * Manually create a new assignment (alternative to AI creation)
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const { title, description, dueDate, subject, difficultyLevel } = body;

    // Validate required fields
    if (!title || !dueDate) {
      return NextResponse.json(
        { error: 'Title and due date are required' },
        { status: 400 }
      );
    }

    // Get database
    const db = await getDatabase();
    const assignmentsCollection = db.collection('assignments');

    // Create assignment document
    const assignment = {
      user_id: payload.userId,
      title,
      description: description || '',
      due_date: new Date(dueDate),
      subject: subject || 'General',
      difficulty_level: difficultyLevel || 'medium',
      total_estimated_hours: 0, // Will be updated when tasks are added
      status: 'active',
      created_at: new Date(),
    };

    // Insert into database
    const result = await assignmentsCollection.insertOne(assignment);

    return NextResponse.json(
      {
        assignmentId: result.insertedId.toString(),
        message: 'Assignment created successfully'
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Create assignment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
