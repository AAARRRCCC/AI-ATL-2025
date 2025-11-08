import { ObjectId } from 'mongodb';

export interface UserPreferences {
  _id?: ObjectId;
  userId: ObjectId;
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    email: boolean;
    push: boolean;
    taskReminders: boolean;
    dailyDigest: boolean;
  };
  studySettings: {
    defaultWorkDuration: number; // in minutes
    defaultBreakDuration: number; // in minutes
    preferredStudyTimes: {
      start: string; // HH:MM format
      end: string; // HH:MM format
    }[];
    daysAvailable: number[]; // 0-6 (Sunday-Saturday)
    subjectStrengths: {
      subject: string;
      needsMoreTime: boolean; // true if user needs more time for this subject
    }[];
    productivityPattern: 'morning' | 'midday' | 'evening'; // preferred work time of day
    assignmentDeadlineBuffer: number; // days before deadline to prefer scheduling work
  };
  calendarIntegration: {
    enabled: boolean;
    provider?: 'google' | 'outlook' | 'apple';
    syncToken?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferencesResponse {
  _id: string;
  userId: string;
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    email: boolean;
    push: boolean;
    taskReminders: boolean;
    dailyDigest: boolean;
  };
  studySettings: {
    defaultWorkDuration: number;
    defaultBreakDuration: number;
    preferredStudyTimes: {
      start: string;
      end: string;
    }[];
    daysAvailable: number[];
    subjectStrengths: {
      subject: string;
      needsMoreTime: boolean;
    }[];
    productivityPattern: 'morning' | 'midday' | 'evening';
    assignmentDeadlineBuffer: number;
  };
  calendarIntegration: {
    enabled: boolean;
    provider?: 'google' | 'outlook' | 'apple';
    syncToken?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdatePreferencesInput {
  theme?: 'light' | 'dark' | 'auto';
  notifications?: {
    email?: boolean;
    push?: boolean;
    taskReminders?: boolean;
    dailyDigest?: boolean;
  };
  studySettings?: {
    defaultWorkDuration?: number;
    defaultBreakDuration?: number;
    preferredStudyTimes?: {
      start: string;
      end: string;
    }[];
    daysAvailable?: number[];
    subjectStrengths?: {
      subject: string;
      needsMoreTime: boolean;
    }[];
    productivityPattern?: 'morning' | 'midday' | 'evening';
    assignmentDeadlineBuffer?: number;
  };
  calendarIntegration?: {
    enabled?: boolean;
    provider?: 'google' | 'outlook' | 'apple';
    syncToken?: string;
  };
}

// Default preferences for new users
export const DEFAULT_USER_PREFERENCES: Omit<
  UserPreferences,
  '_id' | 'userId' | 'createdAt' | 'updatedAt'
> = {
  theme: 'auto',
  notifications: {
    email: true,
    push: true,
    taskReminders: true,
    dailyDigest: false,
  },
  studySettings: {
    defaultWorkDuration: 50, // 50 minutes
    defaultBreakDuration: 10, // 10 minutes
    preferredStudyTimes: [],
    daysAvailable: [1, 2, 3, 4, 5], // Monday-Friday
    subjectStrengths: [],
    productivityPattern: 'midday',
    assignmentDeadlineBuffer: 2, // 2 days before deadline
  },
  calendarIntegration: {
    enabled: false,
  },
};

// Helper function to convert UserPreferences to UserPreferencesResponse
export function toUserPreferencesResponse(
  preferences: UserPreferences
): UserPreferencesResponse {
  return {
    _id: preferences._id!.toString(),
    userId: preferences.userId.toString(),
    theme: preferences.theme,
    notifications: preferences.notifications,
    studySettings: preferences.studySettings,
    calendarIntegration: preferences.calendarIntegration,
    createdAt: preferences.createdAt,
    updatedAt: preferences.updatedAt,
  };
}

// Collection name
export const USER_PREFERENCES_COLLECTION = 'user_preferences';
