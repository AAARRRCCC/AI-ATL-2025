import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { comparePassword, generateToken } from '@/lib/auth';
import {
  User,
  LoginInput,
  USERS_COLLECTION,
  toUserResponse,
  AuthResponse,
} from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const body: LoginInput = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const usersCollection = db.collection<User>(USERS_COLLECTION);

    // Find user by email
    const user = await usersCollection.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Compare passwords
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Update last login
    await usersCollection.updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date(), updatedAt: new Date() } }
    );

    // Generate JWT token
    const token = generateToken(user._id!, email);

    // Return user data (without password) and token
    const userResponse = toUserResponse(user);
    const response: AuthResponse = {
      user: userResponse,
      token,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
