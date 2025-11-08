import { ObjectId } from 'mongodb';

export interface User {
  _id?: ObjectId;
  email: string;
  password: string; // hashed password
  name: string;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  // Google OAuth tokens for calendar integration
  googleAccessToken?: string;
  googleRefreshToken?: string;
  googleTokenExpiry?: Date;
}

export interface UserResponse {
  _id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: UserResponse;
  token: string;
}

// Helper function to convert User to UserResponse (remove password)
export function toUserResponse(user: User): UserResponse {
  return {
    _id: user._id!.toString(),
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLogin: user.lastLogin,
  };
}

// Collection name
export const USERS_COLLECTION = 'users';
