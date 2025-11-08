import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { hashPassword, generateToken } from '@/lib/auth';
import {
  User,
  CreateUserInput,
  USERS_COLLECTION,
  toUserResponse,
  AuthResponse,
} from '@/models/User';
import {
  UserPreferences,
  USER_PREFERENCES_COLLECTION,
  DEFAULT_USER_PREFERENCES,
} from '@/models/UserPreferences';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const body: CreateUserInput = await request.json();
    const { email, password, name } = body;

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const usersCollection = db.collection<User>(USERS_COLLECTION);

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const now = new Date();
    const newUser: User = {
      email,
      password: hashedPassword,
      name,
      createdAt: now,
      updatedAt: now,
    };

    const result = await usersCollection.insertOne(newUser);
    const userId = result.insertedId;

    // Create default user preferences
    const preferencesCollection = db.collection<UserPreferences>(
      USER_PREFERENCES_COLLECTION
    );
    const newPreferences: UserPreferences = {
      ...DEFAULT_USER_PREFERENCES,
      userId,
      createdAt: now,
      updatedAt: now,
    };
    await preferencesCollection.insertOne(newPreferences);

    // Generate JWT token
    const token = generateToken(userId, email);

    // Return user data (without password) and token
    const userResponse = toUserResponse({ ...newUser, _id: userId });
    const response: AuthResponse = {
      user: userResponse,
      token,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
