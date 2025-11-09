import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { USER_PREFERENCES_COLLECTION, UserPreferences } from '@/models/UserPreferences';
import { ObjectId } from 'mongodb';

// List of valid IANA timezone identifiers (subset for validation)
// Full list: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
const VALID_TIMEZONES = new Set([
  // North America
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Phoenix', 'America/Anchorage', 'America/Honolulu',
  'America/Toronto', 'America/Vancouver', 'America/Mexico_City',
  // Europe
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Rome',
  'Europe/Madrid', 'Europe/Amsterdam', 'Europe/Brussels', 'Europe/Vienna',
  'Europe/Stockholm', 'Europe/Copenhagen', 'Europe/Oslo', 'Europe/Helsinki',
  'Europe/Warsaw', 'Europe/Prague', 'Europe/Budapest', 'Europe/Athens',
  'Europe/Zurich', 'Europe/Lisbon', 'Europe/Dublin', 'Europe/Moscow',
  // Asia
  'Asia/Tokyo', 'Asia/Seoul', 'Asia/Shanghai', 'Asia/Hong_Kong',
  'Asia/Singapore', 'Asia/Bangkok', 'Asia/Dubai', 'Asia/Kolkata',
  'Asia/Manila', 'Asia/Jakarta', 'Asia/Tehran', 'Asia/Baghdad',
  // Australia / Pacific
  'Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane',
  'Australia/Perth', 'Pacific/Auckland', 'Pacific/Fiji',
  // South America
  'America/Sao_Paulo', 'America/Buenos_Aires', 'America/Santiago',
  // Africa
  'Africa/Cairo', 'Africa/Johannesburg', 'Africa/Lagos', 'Africa/Nairobi',
  // UTC
  'UTC', 'Etc/UTC',
]);

/**
 * POST /api/timezone/detect
 *
 * Accepts timezone from client and stores it in user preferences.
 *
 * Request body:
 * {
 *   "timezone": "America/New_York"  // IANA timezone string
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "timezone": "America/New_York",
 *   "message": "Timezone updated successfully"
 * }
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
    const { timezone } = await request.json();

    if (!timezone || typeof timezone !== 'string') {
      return NextResponse.json(
        { error: 'Timezone is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate timezone format (IANA timezone or basic validation)
    // Accept all timezones that look reasonable (allow more than our whitelist)
    const isValidFormat = /^[A-Za-z]+\/[A-Za-z_]+$/.test(timezone) ||
                          timezone === 'UTC' ||
                          timezone.startsWith('Etc/');

    if (!isValidFormat) {
      return NextResponse.json(
        {
          error: 'Invalid timezone format. Expected IANA timezone (e.g., "America/New_York")'
        },
        { status: 400 }
      );
    }

    // Optional: Warn if timezone not in common list (but still accept it)
    const isCommonTimezone = VALID_TIMEZONES.has(timezone);
    console.log(
      `Timezone detection for user ${payload.userId}: ${timezone} ` +
      `(${isCommonTimezone ? 'common' : 'uncommon'} timezone)`
    );

    // Update user preferences
    const db = await getDatabase();
    const preferencesCollection = db.collection<UserPreferences>(
      USER_PREFERENCES_COLLECTION
    );

    const result = await preferencesCollection.updateOne(
      { userId: new ObjectId(payload.userId) },
      {
        $set: {
          timezone: timezone,
          updatedAt: new Date()
        }
      },
      { upsert: true } // Create if doesn't exist
    );

    if (!result.acknowledged) {
      return NextResponse.json(
        { error: 'Failed to update timezone' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      timezone: timezone,
      message: 'Timezone updated successfully',
      isCommonTimezone: isCommonTimezone
    }, { status: 200 });

  } catch (error) {
    console.error('Timezone detection error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/timezone/detect
 *
 * Returns the user's current timezone setting.
 *
 * Response:
 * {
 *   "timezone": "America/New_York" | null,
 *   "message": "Timezone retrieved successfully"
 * }
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

    // Get user preferences
    const db = await getDatabase();
    const preferencesCollection = db.collection<UserPreferences>(
      USER_PREFERENCES_COLLECTION
    );

    const preferences = await preferencesCollection.findOne({
      userId: new ObjectId(payload.userId),
    });

    return NextResponse.json({
      timezone: preferences?.timezone || null,
      message: 'Timezone retrieved successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Get timezone error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
