# Development Guide - Study Autopilot

> Guide for adding features and working with the codebase

**Target Audience**: Experienced developers & AI assistants adding features

**Last Updated**: 2025-01-08

---

## Table of Contents

1. [Development Setup](#development-setup)
2. [Project Architecture](#project-architecture)
3. [Common Development Tasks](#common-development-tasks)
4. [Code Patterns](#code-patterns)
5. [Database Operations](#database-operations)
6. [API Development](#api-development)
7. [Adding Components](#adding-components)
8. [Working with AI](#working-with-ai)
9. [Styling Guidelines](#styling-guidelines)
10. [Testing Strategy](#testing-strategy)
11. [Debugging](#debugging)
12. [Git Workflow](#git-workflow)

---

## Development Setup

### Environment Requirements

```bash
Node.js: 18+ (recommend 20.x)
Python: 3.11 or 3.12 (avoid 3.14)
MongoDB: Atlas account (free tier)
Google Cloud: Project with OAuth + Calendar API
Google AI: Gemini API key
```

### Initial Setup

```bash
# Clone repository
git clone <repo-url>
cd "AI ATL 2025"

# Install frontend dependencies
npm install --legacy-peer-deps

# Set up backend
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
cd ..

# Create environment files (see README.md for contents)
touch .env.local
touch backend/.env
```

### Running Development Servers

**Terminal 1 - Frontend**:
```bash
npm run dev
# → http://localhost:3000
```

**Terminal 2 - Backend**:
```bash
cd backend
venv\Scripts\activate
python main.py
# → http://localhost:8000
```

### IDE Setup

**Recommended**: VS Code with extensions:
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- Python
- Pylance

---

## Project Architecture

### Frontend Structure

```
app/
├── api/              # Next.js API routes (REST endpoints)
├── auth/             # Authentication page
├── dashboard/        # Main app page (protected)
├── preferences/      # User settings page
├── layout.tsx        # Root layout with providers
├── page.tsx          # Landing page
└── globals.css       # Global styles

components/           # React components
├── chat/            # Chat UI components
├── ui/              # Reusable UI components
└── *.tsx            # Feature-specific components

contexts/            # React contexts (global state)
hooks/               # Custom React hooks
lib/                 # Utility libraries
models/              # TypeScript models
```

### Backend Structure

```
backend/
├── ai/              # AI integration
│   ├── chat_handler.py
│   └── functions.py
├── auth/            # Auth utilities
├── database/        # Database connection
├── models/          # Pydantic models
├── routes/          # API routes (to be implemented)
├── services/        # Business logic
│   └── function_executor.py
└── main.py          # FastAPI app
```

### Key Design Patterns

1. **BFF (Backend for Frontend)**: Next.js API routes call FastAPI backend
2. **Component-Based UI**: Small, reusable React components
3. **Context for Global State**: Theme, auth status
4. **Custom Hooks**: Encapsulate stateful logic (WebSocket, data fetching)
5. **Server Components**: Use where possible for performance
6. **Client Components**: When interactivity needed

---

## Common Development Tasks

### Task 1: Add a New API Endpoint

#### Frontend (Next.js API Route)

**1. Create route file**:
```bash
# For GET /api/assignments
mkdir -p app/api/assignments
touch app/api/assignments/route.ts
```

**2. Implement handler**:
```typescript
// app/api/assignments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 2. Connect to database
    const { db } = await connectToDatabase();

    // 3. Query data
    const assignments = await db
      .collection('assignments')
      .find({ userId: decoded.userId })
      .toArray();

    // 4. Return response
    return NextResponse.json({ assignments });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignments' },
      { status: 500 }
    );
  }
}
```

**3. Add POST handler** (same file):
```typescript
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    const decoded = verifyToken(token);

    const body = await request.json();
    const { title, type, dueDate, subject, estimatedHours } = body;

    // Validate
    if (!title || !type || !dueDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Insert
    const result = await db.collection('assignments').insertOne({
      userId: decoded.userId,
      title,
      type,
      dueDate: new Date(dueDate),
      subject,
      estimatedHours,
      status: 'active',
      createdAt: new Date(),
    });

    return NextResponse.json(
      { assignmentId: result.insertedId },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating assignment:', error);
    return NextResponse.json(
      { error: 'Failed to create assignment' },
      { status: 500 }
    );
  }
}
```

**4. Test endpoint**:
```bash
# Using curl
curl http://localhost:3000/api/assignments \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Task 2: Add a New React Component

#### 1. Create component file

```bash
# For AssignmentCard component
touch components/AssignmentCard.tsx
```

#### 2. Implement component

```typescript
// components/AssignmentCard.tsx
'use client';

import React from 'react';
import { Calendar, Clock, BookOpen } from 'lucide-react';

interface AssignmentCardProps {
  id: string;
  title: string;
  type: string;
  dueDate: Date;
  subject: string;
  progress: number;
  onClick?: () => void;
}

export default function AssignmentCard({
  id,
  title,
  type,
  dueDate,
  subject,
  progress,
  onClick,
}: AssignmentCardProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  return (
    <div
      onClick={onClick}
      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg
                 hover:shadow-lg transition-shadow cursor-pointer
                 bg-white dark:bg-gray-800"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
            {title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {subject}
          </p>
        </div>
        <span className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900
                       text-blue-800 dark:text-blue-200">
          {type}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600 dark:text-gray-400">Progress</span>
          <span className="text-gray-900 dark:text-white font-medium">
            {progress}%
          </span>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          <span>Due {formatDate(dueDate)}</span>
        </div>
      </div>
    </div>
  );
}
```

#### 3. Use component

```typescript
// app/dashboard/page.tsx
import AssignmentCard from '@/components/AssignmentCard';

export default function Dashboard() {
  const assignments = [
    {
      id: '1',
      title: 'History Essay',
      type: 'essay',
      dueDate: new Date('2025-01-17'),
      subject: 'History',
      progress: 45,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {assignments.map((assignment) => (
        <AssignmentCard
          key={assignment.id}
          {...assignment}
          onClick={() => console.log('Clicked:', assignment.id)}
        />
      ))}
    </div>
  );
}
```

---

### Task 3: Add a New AI Function

#### 1. Declare function in `backend/ai/functions.py`

```python
# backend/ai/functions.py

# Add to FUNCTION_DECLARATIONS list:
{
    "name": "get_assignment_progress",
    "description": "Gets the progress and status of an assignment",
    "parameters": {
        "type": "object",
        "properties": {
            "assignment_id": {
                "type": "string",
                "description": "The ID of the assignment"
            }
        },
        "required": ["assignment_id"]
    }
}
```

#### 2. Implement execution in `backend/services/function_executor.py`

```python
# backend/services/function_executor.py

class FunctionExecutor:
    async def execute(self, function_name: str, arguments: dict):
        if function_name == "get_assignment_progress":
            return await self._get_assignment_progress(arguments)
        # ... other functions

    async def _get_assignment_progress(self, args: dict):
        assignment_id = args.get("assignment_id")

        # Query database
        assignment = await self.db.assignments.find_one({
            "_id": ObjectId(assignment_id),
            "userId": self.user_id
        })

        if not assignment:
            return {"error": "Assignment not found"}

        # Calculate progress
        tasks = await self.db.tasks.find({
            "assignmentId": ObjectId(assignment_id)
        }).to_list(length=None)

        total_tasks = len(tasks)
        completed_tasks = len([t for t in tasks if t.get("status") == "completed"])
        progress_percentage = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0

        return {
            "assignmentId": str(assignment["_id"]),
            "title": assignment["title"],
            "totalTasks": total_tasks,
            "completedTasks": completed_tasks,
            "progress": progress_percentage,
            "status": assignment["status"]
        }
```

#### 3. Test in chat

```
User: "What's the progress on my history essay?"
AI: [Calls get_assignment_progress function]
AI: "Your history essay is 45% complete. You've finished 3 out of 7 tasks."
```

---

### Task 4: Add Database Operation

#### Frontend (Next.js with MongoDB)

```typescript
// Example: Update user preferences
import { connectToDatabase } from '@/lib/mongodb';

export async function updatePreferences(userId: string, preferences: any) {
  const { db } = await connectToDatabase();

  const result = await db.collection('user_preferences').updateOne(
    { userId },
    {
      $set: {
        ...preferences,
        updatedAt: new Date(),
      },
    },
    { upsert: true } // Create if doesn't exist
  );

  return result;
}
```

#### Backend (Python with Motor)

```python
# backend/services/user_service.py
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

class UserService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db

    async def get_user_assignments(self, user_id: str):
        assignments = await self.db.assignments.find({
            "userId": ObjectId(user_id),
            "status": "active"
        }).sort("dueDate", 1).to_list(length=100)

        return assignments

    async def create_assignment(self, user_id: str, data: dict):
        assignment = {
            "userId": ObjectId(user_id),
            "title": data["title"],
            "type": data["type"],
            "dueDate": data["dueDate"],
            "status": "active",
            "createdAt": datetime.utcnow()
        }

        result = await self.db.assignments.insert_one(assignment)
        return str(result.inserted_id)
```

---

## Code Patterns

### Pattern 1: Protected API Route

```typescript
// Common pattern used throughout app/api/*
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  // 1. Extract token
  const token = request.headers.get('authorization')?.split(' ')[1];

  // 2. Verify token
  if (!token) {
    return NextResponse.json({ error: 'No token provided' }, { status: 401 });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // 3. Use decoded.userId for operations
  const userId = decoded.userId;

  // ... rest of logic
}
```

### Pattern 2: Data Fetching with Loading States

```typescript
'use client';

import { useState, useEffect } from 'react';

export default function DataComponent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await fetch('/api/data', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Failed to fetch');

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return null;

  return <div>{/* Render data */}</div>;
}
```

### Pattern 3: Form with Validation

```typescript
'use client';

import { useState } from 'react';

export default function FormComponent() {
  const [formData, setFormData] = useState({
    title: '',
    dueDate: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const newErrors = {};

    if (!formData.title) {
      newErrors.title = 'Title is required';
    }

    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');

      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to submit');

      // Success - redirect or update UI
      window.location.href = '/dashboard';
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
      />
      {errors.title && <span className="text-red-500">{errors.title}</span>}

      <button type="submit" disabled={submitting}>
        {submitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
```

### Pattern 4: MongoDB Query Helpers

```typescript
// lib/database-helpers.ts
import { connectToDatabase } from './mongodb';
import { ObjectId } from 'mongodb';

export async function findUserById(userId: string) {
  const { db } = await connectToDatabase();
  return await db.collection('users').findOne({ _id: new ObjectId(userId) });
}

export async function updateDocument(
  collection: string,
  id: string,
  update: any
) {
  const { db } = await connectToDatabase();
  return await db.collection(collection).updateOne(
    { _id: new ObjectId(id) },
    { $set: { ...update, updatedAt: new Date() } }
  );
}

export async function findDocuments(
  collection: string,
  filter: any,
  options?: any
) {
  const { db } = await connectToDatabase();
  return await db.collection(collection).find(filter, options).toArray();
}
```

---

## Database Operations

### Common MongoDB Queries

#### Insert One

```typescript
const result = await db.collection('assignments').insertOne({
  userId: new ObjectId(userId),
  title: 'New Assignment',
  createdAt: new Date(),
});

const insertedId = result.insertedId;
```

#### Find One

```typescript
const user = await db.collection('users').findOne({
  _id: new ObjectId(userId),
});
```

#### Find Many

```typescript
const assignments = await db
  .collection('assignments')
  .find({
    userId: new ObjectId(userId),
    status: 'active',
  })
  .sort({ dueDate: 1 })
  .limit(10)
  .toArray();
```

#### Update One

```typescript
await db.collection('assignments').updateOne(
  { _id: new ObjectId(assignmentId) },
  {
    $set: {
      status: 'completed',
      completedAt: new Date(),
    },
  }
);
```

#### Delete One

```typescript
await db.collection('assignments').deleteOne({
  _id: new ObjectId(assignmentId),
  userId: new ObjectId(userId), // Important: Verify ownership
});
```

#### Aggregation

```typescript
const stats = await db
  .collection('assignments')
  .aggregate([
    { $match: { userId: new ObjectId(userId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ])
  .toArray();
```

---

## API Development

### REST API Best Practices

1. **Use HTTP methods correctly**:
   - GET: Retrieve data
   - POST: Create new resource
   - PUT: Update entire resource
   - PATCH: Update partial resource
   - DELETE: Remove resource

2. **Return appropriate status codes**:
   - 200: Success (GET, PUT, PATCH)
   - 201: Created (POST)
   - 204: No Content (DELETE)
   - 400: Bad Request
   - 401: Unauthorized
   - 404: Not Found
   - 500: Server Error

3. **Consistent error format**:
```typescript
return NextResponse.json(
  { error: 'Error message', details: 'Optional details' },
  { status: 400 }
);
```

4. **Always authenticate protected routes**
5. **Validate input before processing**
6. **Handle errors gracefully**
7. **Log errors for debugging**

---

## Adding Components

### Component Checklist

- [ ] TypeScript interface for props
- [ ] Client Component directive if interactive (`'use client'`)
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Dark mode support
- [ ] Loading states
- [ ] Error states
- [ ] Accessibility (aria labels, keyboard navigation)
- [ ] Semantic HTML
- [ ] Proper event handlers

### Example Component Template

```typescript
'use client';

import React, { useState } from 'react';

interface ComponentNameProps {
  title: string;
  onAction?: () => void;
}

export default function ComponentName({ title, onAction }: ComponentNameProps) {
  const [state, setState] = useState(false);

  const handleClick = () => {
    setState(!state);
    onAction?.();
  };

  return (
    <div className="component-container">
      <h2>{title}</h2>
      <button onClick={handleClick}>Action</button>
    </div>
  );
}
```

---

## Working with AI

### Testing AI Functions Locally

```python
# backend/test_ai.py
import asyncio
from ai.chat_handler import ChatHandler

async def test_function_call():
    handler = ChatHandler(user_id="test_user_id")

    # Simulate user message
    response = await handler.handle_message(
        "I have a history essay due next Friday"
    )

    print("AI Response:", response)

if __name__ == "__main__":
    asyncio.run(test_function_call())
```

### Debugging AI Responses

Add logging to `chat_handler.py`:

```python
# backend/ai/chat_handler.py
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# In handle_message:
logger.debug(f"User message: {message}")
logger.debug(f"AI response: {response}")
logger.debug(f"Function calls: {function_calls}")
```

---

## Styling Guidelines

### Tailwind CSS Patterns

**Dark Mode Support**:
```tsx
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
  {/* Content */}
</div>
```

**Responsive Design**:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Items */}
</div>
```

**Hover States**:
```tsx
<button className="hover:bg-blue-600 hover:shadow-lg transition-all">
  Click Me
</button>
```

**Common Color Palette**:
- Primary: Blue (`blue-500`, `blue-600`)
- Secondary: Purple (`purple-500`, `purple-600`)
- Success: Green (`green-500`)
- Error: Red (`red-500`)
- Warning: Yellow (`yellow-500`)

---

## Testing Strategy

### Unit Testing (Not Yet Implemented)

**Recommended Setup**:
```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
```

**Example Test**:
```typescript
// components/__tests__/AssignmentCard.test.tsx
import { render, screen } from '@testing-library/react';
import AssignmentCard from '../AssignmentCard';

describe('AssignmentCard', () => {
  it('renders assignment title', () => {
    render(
      <AssignmentCard
        id="1"
        title="Test Assignment"
        type="essay"
        dueDate={new Date()}
        subject="Math"
        progress={50}
      />
    );

    expect(screen.getByText('Test Assignment')).toBeInTheDocument();
  });
});
```

---

## Debugging

### Frontend Debugging

**Browser DevTools**:
- Console: Check for errors and logs
- Network: Monitor API requests
- React DevTools: Inspect component tree

**Add Debug Logging**:
```typescript
console.log('[DEBUG] User data:', userData);
console.log('[DEBUG] API response:', response);
```

### Backend Debugging

**Python Debugger**:
```python
import pdb; pdb.set_trace()  # Set breakpoint
```

**Logging**:
```python
import logging
logger = logging.getLogger(__name__)
logger.debug("Debug message")
logger.info("Info message")
logger.error("Error message")
```

---

## Git Workflow

### Branch Naming

```
feature/add-assignment-crud
bugfix/calendar-drag-drop
hotfix/security-websocket-auth
refactor/database-queries
```

### Commit Messages

```
feat: Add assignment creation API
fix: Resolve WebSocket authentication bypass
refactor: Extract calendar logic to utility
docs: Update API documentation
style: Format code with Prettier
test: Add unit tests for auth flow
```

### Workflow

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes
git add .
git commit -m "feat: Add new feature"

# Push
git push origin feature/new-feature

# Create pull request on GitHub
```

---

## Summary

This guide covers the most common development tasks for Study Autopilot. For specific implementation details, refer to:

- **ARCHITECTURE.md**: System design and data flow
- **API_REFERENCE.md**: Complete API documentation
- **IMPLEMENTATION_STATUS.md**: Feature status tracking
- **TODO.md**: Prioritized task list

**Questions?** Check existing code for patterns, or refer to the comprehensive analysis in the archived docs.
