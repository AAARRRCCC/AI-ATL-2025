import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import {
  UserPreferences,
  USER_PREFERENCES_COLLECTION,
  toUserPreferencesResponse,
  UpdatePreferencesInput,
  DEFAULT_USER_PREFERENCES,
} from '@/models/UserPreferences';
import { ObjectId } from 'mongodb';

// GET /api/preferences - Get user preferences
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

    // Get preferences from database
    const db = await getDatabase();
    const preferencesCollection = db.collection<UserPreferences>(
      USER_PREFERENCES_COLLECTION
    );
    let preferences = await preferencesCollection.findOne({
      userId: new ObjectId(payload.userId),
    });

    // If preferences don't exist, create them (for old users)
    if (!preferences) {
      console.log(`Creating default preferences for user: ${payload.userId}`);
      const now = new Date();
      const newPreferences: UserPreferences = {
        ...DEFAULT_USER_PREFERENCES,
        userId: new ObjectId(payload.userId),
        createdAt: now,
        updatedAt: now,
      };

      const insertResult = await preferencesCollection.insertOne(newPreferences);

      // Fetch the newly created document with _id
      preferences = await preferencesCollection.findOne({
        _id: insertResult.insertedId,
      });

      if (!preferences) {
        return NextResponse.json(
          { error: 'Failed to create preferences' },
          { status: 500 }
        );
      }
    }

    // Merge with defaults to ensure all fields are present
    const mergedPreferences: UserPreferences = {
      ...preferences,
      studySettings: {
        ...DEFAULT_USER_PREFERENCES.studySettings,
        ...preferences.studySettings,
      },
      notifications: {
        ...DEFAULT_USER_PREFERENCES.notifications,
        ...preferences.notifications,
      },
      calendarIntegration: {
        ...DEFAULT_USER_PREFERENCES.calendarIntegration,
        ...preferences.calendarIntegration,
      },
    };

    const preferencesResponse = toUserPreferencesResponse(mergedPreferences);
    return NextResponse.json(preferencesResponse, { status: 200 });
  } catch (error) {
    console.error('Get preferences error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/preferences - Update user preferences
export async function PUT(request: NextRequest) {
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
    const updates: UpdatePreferencesInput = await request.json();

    // Build update object
    const updateFields: any = {
      updatedAt: new Date(),
    };

    // Update only provided fields
    if (updates.theme !== undefined) {
      updateFields.theme = updates.theme;
    }

    if (updates.notifications) {
      if (updates.notifications.email !== undefined) {
        updateFields['notifications.email'] = updates.notifications.email;
      }
      if (updates.notifications.push !== undefined) {
        updateFields['notifications.push'] = updates.notifications.push;
      }
      if (updates.notifications.taskReminders !== undefined) {
        updateFields['notifications.taskReminders'] =
          updates.notifications.taskReminders;
      }
      if (updates.notifications.dailyDigest !== undefined) {
        updateFields['notifications.dailyDigest'] =
          updates.notifications.dailyDigest;
      }
    }

    if (updates.studySettings) {
      if (updates.studySettings.defaultWorkDuration !== undefined) {
        updateFields['studySettings.defaultWorkDuration'] =
          updates.studySettings.defaultWorkDuration;
      }
      if (updates.studySettings.defaultBreakDuration !== undefined) {
        updateFields['studySettings.defaultBreakDuration'] =
          updates.studySettings.defaultBreakDuration;
      }
      if (updates.studySettings.preferredStudyTimes !== undefined) {
        updateFields['studySettings.preferredStudyTimes'] =
          updates.studySettings.preferredStudyTimes;
      }
      if (updates.studySettings.daysAvailable !== undefined) {
        updateFields['studySettings.daysAvailable'] =
          updates.studySettings.daysAvailable;
      }
      if (updates.studySettings.subjectStrengths !== undefined) {
        updateFields['studySettings.subjectStrengths'] =
          updates.studySettings.subjectStrengths;
      }
      if (updates.studySettings.productivityPattern !== undefined) {
        updateFields['studySettings.productivityPattern'] =
          updates.studySettings.productivityPattern;
      }
      if (updates.studySettings.assignmentDeadlineBuffer !== undefined) {
        updateFields['studySettings.assignmentDeadlineBuffer'] =
          updates.studySettings.assignmentDeadlineBuffer;
      }
      if (updates.studySettings.calendarViewStart !== undefined) {
        updateFields['studySettings.calendarViewStart'] =
          updates.studySettings.calendarViewStart;
      }
      if (updates.studySettings.calendarViewEnd !== undefined) {
        updateFields['studySettings.calendarViewEnd'] =
          updates.studySettings.calendarViewEnd;
      }
    }

    if (updates.calendarIntegration) {
      if (updates.calendarIntegration.enabled !== undefined) {
        updateFields['calendarIntegration.enabled'] =
          updates.calendarIntegration.enabled;
      }
      if (updates.calendarIntegration.provider !== undefined) {
        updateFields['calendarIntegration.provider'] =
          updates.calendarIntegration.provider;
      }
      if (updates.calendarIntegration.syncToken !== undefined) {
        updateFields['calendarIntegration.syncToken'] =
          updates.calendarIntegration.syncToken;
      }
    }

    // Update preferences in database
    const db = await getDatabase();
    const preferencesCollection = db.collection<UserPreferences>(
      USER_PREFERENCES_COLLECTION
    );

    const result = await preferencesCollection.findOneAndUpdate(
      { userId: new ObjectId(payload.userId) },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json(
        { error: 'Preferences not found' },
        { status: 404 }
      );
    }

    const preferencesResponse = toUserPreferencesResponse(result);
    return NextResponse.json(preferencesResponse, { status: 200 });
  } catch (error) {
    console.error('Update preferences error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
