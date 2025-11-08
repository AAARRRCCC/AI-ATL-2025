# Database Documentation

## Overview

Study Autopilot uses MongoDB Atlas as its database solution. This document covers setup, schema design, and querying patterns for local development and production.

## Table of Contents

1. [Getting Started](#getting-started)
2. [MongoDB Atlas Setup](#mongodb-atlas-setup)
3. [Local Development Setup](#local-development-setup)
4. [Database Schema](#database-schema)
5. [Querying Patterns](#querying-patterns)
6. [Security Best Practices](#security-best-practices)

---

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A MongoDB Atlas account (free tier available)
- Basic knowledge of MongoDB and NoSQL databases

---

## MongoDB Atlas Setup

### Step 1: Create a MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account or log in
3. Create a new project (e.g., "Study Autopilot")

### Step 2: Create a Database Cluster

1. Click "Build a Database"
2. Choose the **Free Tier** (M0 Sandbox) for development
3. Select your preferred cloud provider and region
4. Click "Create Cluster"

### Step 3: Configure Database Access

1. Go to "Database Access" in the left sidebar
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Create a username and strong password
5. Set "Database User Privileges" to "Read and write to any database"
6. Click "Add User"

### Step 4: Configure Network Access

1. Go to "Network Access" in the left sidebar
2. Click "Add IP Address"
3. For development, you can click "Allow Access from Anywhere" (0.0.0.0/0)
   - **Note**: For production, restrict this to your server's IP address
4. Click "Confirm"

### Step 5: Get Your Connection String

1. Go to "Database" in the left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Copy the connection string (it looks like this):
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Replace `<username>` and `<password>` with your database user credentials

---

## Local Development Setup

### Step 1: Clone the Repository

```bash
git clone <your-repo-url>
cd AI-ATL-2025
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and add your MongoDB connection string:
   ```env
   MONGODB_URI=mongodb+srv://your-username:your-password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   MONGODB_DB_NAME=study-autopilot
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=7d
   ```

3. Generate a secure JWT secret:
   ```bash
   openssl rand -base64 32
   ```
   Copy the output and use it as your `JWT_SECRET`

### Step 4: Start the Development Server

```bash
npm run dev
```

Your application should now be running at `http://localhost:3000` and connected to MongoDB Atlas!

---

## Database Schema

### Collections Overview

The database consists of two main collections:

1. **users** - Stores user account information
2. **user_preferences** - Stores user preferences and settings

### Users Collection

**Collection Name**: `users`

**Schema**:

```typescript
{
  _id: ObjectId,              // Auto-generated MongoDB ID
  email: string,              // User's email (unique)
  password: string,           // Hashed password (bcrypt)
  name: string,               // User's full name
  createdAt: Date,            // Account creation timestamp
  updatedAt: Date,            // Last update timestamp
  lastLogin: Date?            // Last login timestamp (optional)
}
```

**Indexes**:
- `email` (unique) - For fast user lookups and preventing duplicate accounts

**Example Document**:

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "email": "john.doe@example.com",
  "password": "$2a$10$N9qo8uLOickgx2ZMRZoMye...",
  "name": "John Doe",
  "createdAt": ISODate("2024-01-15T10:30:00Z"),
  "updatedAt": ISODate("2024-01-20T14:22:00Z"),
  "lastLogin": ISODate("2024-01-20T14:22:00Z")
}
```

### User Preferences Collection

**Collection Name**: `user_preferences`

**Schema**:

```typescript
{
  _id: ObjectId,              // Auto-generated MongoDB ID
  userId: ObjectId,           // Reference to users collection
  theme: "light" | "dark" | "auto",
  notifications: {
    email: boolean,           // Email notifications enabled
    push: boolean,            // Push notifications enabled
    taskReminders: boolean,   // Task reminder notifications
    dailyDigest: boolean      // Daily digest email
  },
  studySettings: {
    defaultWorkDuration: number,    // In minutes (default: 50)
    defaultBreakDuration: number,   // In minutes (default: 10)
    preferredStudyTimes: [
      {
        start: string,        // HH:MM format (e.g., "09:00")
        end: string           // HH:MM format (e.g., "17:00")
      }
    ],
    daysAvailable: number[]   // 0-6 (Sunday-Saturday)
  },
  calendarIntegration: {
    enabled: boolean,
    provider?: "google" | "outlook" | "apple",
    syncToken?: string        // OAuth token for calendar sync
  },
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
- `userId` (unique) - One preferences document per user

**Example Document**:

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439012"),
  "userId": ObjectId("507f1f77bcf86cd799439011"),
  "theme": "auto",
  "notifications": {
    "email": true,
    "push": true,
    "taskReminders": true,
    "dailyDigest": false
  },
  "studySettings": {
    "defaultWorkDuration": 50,
    "defaultBreakDuration": 10,
    "preferredStudyTimes": [
      {
        "start": "09:00",
        "end": "12:00"
      },
      {
        "start": "14:00",
        "end": "17:00"
      }
    ],
    "daysAvailable": [1, 2, 3, 4, 5]
  },
  "calendarIntegration": {
    "enabled": false
  },
  "createdAt": ISODate("2024-01-15T10:30:00Z"),
  "updatedAt": ISODate("2024-01-15T10:30:00Z")
}
```

---

## Querying Patterns

### Common Database Operations

#### 1. User Registration

```typescript
import { getDatabase } from '@/lib/mongodb';
import { hashPassword } from '@/lib/auth';
import { User, USERS_COLLECTION } from '@/models/User';
import {
  UserPreferences,
  USER_PREFERENCES_COLLECTION,
  DEFAULT_USER_PREFERENCES
} from '@/models/UserPreferences';

// Create a new user
const db = await getDatabase();
const usersCollection = db.collection<User>(USERS_COLLECTION);

const hashedPassword = await hashPassword(password);
const newUser: User = {
  email,
  password: hashedPassword,
  name,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const result = await usersCollection.insertOne(newUser);
const userId = result.insertedId;

// Create default preferences for the user
const preferencesCollection = db.collection<UserPreferences>(
  USER_PREFERENCES_COLLECTION
);
const newPreferences: UserPreferences = {
  ...DEFAULT_USER_PREFERENCES,
  userId,
  createdAt: new Date(),
  updatedAt: new Date(),
};
await preferencesCollection.insertOne(newPreferences);
```

#### 2. User Login

```typescript
import { getDatabase } from '@/lib/mongodb';
import { comparePassword } from '@/lib/auth';
import { User, USERS_COLLECTION } from '@/models/User';

const db = await getDatabase();
const usersCollection = db.collection<User>(USERS_COLLECTION);

// Find user by email
const user = await usersCollection.findOne({ email });

if (!user) {
  throw new Error('User not found');
}

// Verify password
const isValid = await comparePassword(password, user.password);

if (!isValid) {
  throw new Error('Invalid password');
}

// Update last login
await usersCollection.updateOne(
  { _id: user._id },
  {
    $set: {
      lastLogin: new Date(),
      updatedAt: new Date()
    }
  }
);
```

#### 3. Get User Profile

```typescript
import { getDatabase } from '@/lib/mongodb';
import { User, USERS_COLLECTION } from '@/models/User';
import { ObjectId } from 'mongodb';

const db = await getDatabase();
const usersCollection = db.collection<User>(USERS_COLLECTION);

const user = await usersCollection.findOne(
  { _id: new ObjectId(userId) },
  { projection: { password: 0 } } // Exclude password from results
);
```

#### 4. Update User Preferences

```typescript
import { getDatabase } from '@/lib/mongodb';
import {
  UserPreferences,
  USER_PREFERENCES_COLLECTION
} from '@/models/UserPreferences';
import { ObjectId } from 'mongodb';

const db = await getDatabase();
const preferencesCollection = db.collection<UserPreferences>(
  USER_PREFERENCES_COLLECTION
);

await preferencesCollection.updateOne(
  { userId: new ObjectId(userId) },
  {
    $set: {
      theme: 'dark',
      'notifications.email': false,
      'studySettings.defaultWorkDuration': 60,
      updatedAt: new Date()
    }
  }
);
```

#### 5. Get User with Preferences (Join)

```typescript
import { getDatabase } from '@/lib/mongodb';
import { USERS_COLLECTION } from '@/models/User';
import { USER_PREFERENCES_COLLECTION } from '@/models/UserPreferences';
import { ObjectId } from 'mongodb';

const db = await getDatabase();
const usersCollection = db.collection(USERS_COLLECTION);

const userWithPreferences = await usersCollection.aggregate([
  { $match: { _id: new ObjectId(userId) } },
  {
    $lookup: {
      from: USER_PREFERENCES_COLLECTION,
      localField: '_id',
      foreignField: 'userId',
      as: 'preferences'
    }
  },
  { $unwind: { path: '$preferences', preserveNullAndEmptyArrays: true } },
  { $project: { password: 0 } } // Exclude password
]).toArray();

const result = userWithPreferences[0];
```

---

## Security Best Practices

### 1. Environment Variables

- **Never commit** `.env` files to version control
- Use `.env.local` for local development (ignored by git)
- Use environment variables in production (Vercel, Heroku, etc.)
- Rotate secrets regularly

### 2. Password Security

- Always hash passwords using bcrypt (implemented in `lib/auth.ts`)
- Use a salt round of at least 10
- Never store or log plain-text passwords

### 3. JWT Tokens

- Use strong, random secrets for JWT signing
- Set appropriate expiration times (7 days for web apps)
- Store tokens securely on the client (localStorage or httpOnly cookies)
- Validate tokens on every protected route

### 4. Database Security

- Use MongoDB's built-in user authentication
- Restrict network access to known IP addresses in production
- Enable encryption at rest and in transit
- Regularly backup your database

### 5. Input Validation

- Validate all user input before storing in the database
- Use TypeScript types to enforce schema structure
- Sanitize data to prevent NoSQL injection

### 6. API Security

- Use HTTPS in production
- Implement rate limiting on authentication endpoints
- Log failed login attempts
- Use CORS to restrict API access

---

## Creating Database Indexes

For optimal performance, create the following indexes in MongoDB Atlas:

### Via MongoDB Compass or Atlas UI:

**Users Collection**:
```javascript
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ createdAt: -1 })
```

**User Preferences Collection**:
```javascript
db.user_preferences.createIndex({ userId: 1 }, { unique: true })
```

### Via Code (run once during setup):

```typescript
import { getDatabase } from '@/lib/mongodb';
import { USERS_COLLECTION } from '@/models/User';
import { USER_PREFERENCES_COLLECTION } from '@/models/UserPreferences';

async function createIndexes() {
  const db = await getDatabase();

  // Users collection indexes
  await db.collection(USERS_COLLECTION).createIndex(
    { email: 1 },
    { unique: true }
  );
  await db.collection(USERS_COLLECTION).createIndex({ createdAt: -1 });

  // User preferences collection indexes
  await db.collection(USER_PREFERENCES_COLLECTION).createIndex(
    { userId: 1 },
    { unique: true }
  );

  console.log('Indexes created successfully');
}
```

---

## Troubleshooting

### Common Issues

**1. Connection Error: "MongoServerError: bad auth"**
- Check that your username and password are correct in `.env.local`
- Ensure you've URL-encoded special characters in the password

**2. Connection Error: "MongooseServerSelectionError: Could not connect"**
- Verify your IP address is whitelisted in MongoDB Atlas Network Access
- Check that your connection string is correct

**3. "User with this email already exists"**
- The email index is enforced - use a different email or delete the existing user

**4. JWT Token Errors**
- Ensure `JWT_SECRET` is set in your environment variables
- Check that the token hasn't expired

---

## Additional Resources

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [MongoDB Node.js Driver Docs](https://www.mongodb.com/docs/drivers/node/current/)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [bcrypt Documentation](https://www.npmjs.com/package/bcryptjs)
- [jsonwebtoken Documentation](https://www.npmjs.com/package/jsonwebtoken)
