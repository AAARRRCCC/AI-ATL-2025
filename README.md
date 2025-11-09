<div align="center">

# SteadyStudy

### AI-Powered Study Planning for Modern Students

*An intelligent study companion that transforms overwhelming assignments into achievable daily tasks*

[![Next.js](https://img.shields.io/badge/Next.js-15.0.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

[Features](#features) • [Quick Start](#quick-start) • [Tech Stack](#tech-stack) • [Documentation](#documentation)

---

</div>

## Overview

**SteadyStudy** is an intelligent study planning application built for the **AI ATL 2025 Hackathon**. It uses Google's Gemini AI to break down complex assignments into manageable tasks, automatically schedules them based on your Google Calendar availability, and provides a conversational interface for managing your entire academic workload.

### The Problem We Solve

Students often struggle with:
-  **Breaking down large assignments** into actionable steps
-  **Finding time to study** amidst busy schedules
-  **Adapting plans** when life gets in the way
-  **Staying motivated** without visible progress tracking

### Our Solution

SteadyStudy combines AI intelligence with calendar integration to:
-  **Intelligently decompose** assignments into phases
-  **Auto-schedule** study sessions in your actual free time
-  **Conversational interface** - just tell the AI what's due and when
-  **Track progress** and maintain study momentum

---

## Features

###  AI-Powered Chat Interface
- **Natural language interaction** with Google Gemini
- **Function calling** - AI can create assignments, schedule tasks, and query your calendar
- **Real-time responses** via WebSocket connection
- **Context-aware** suggestions based on your study history

###  Smart Calendar Integration
- **Two-way Google Calendar sync** - read existing events, write study sessions
- **Drag-and-drop rescheduling** - visual calendar interface
- **Intelligent time-finding** - analyzes free blocks in your schedule
- **Color-coded events** - distinguish task types at a glance

###  Personalized Preferences
- **Available days** - work around your schedule
- **Task difficulty levels** - AI adjusts time allocation
- **Theme support** - dark mode for late-night study sessions

###  Secure Authentication
- **Email/password** registration and login
- **Google OAuth** for seamless calendar access
- **JWT tokens** with secure session management
- **Protected routes** - your data stays private

---

### Typical User Flow

1. **Landing Page** - Professional hero section with animated background  
2. **Create Account** - Sign up with email/password in seconds  
3. **Connect Calendar** - One-click Google OAuth integration  
4. **Set Preferences** - Choose your ideal study times and available days  
5. **Chat with AI** - "I have a 10-page research paper due next Friday"  
6. **AI Planning** - Breaks down into research, outline, draft, and revision phases  
7. **View Schedule** - Auto-scheduled study sessions appear in your calendar  
8. **Drag to Adjust** - Reschedule sessions with visual calendar interface  
9. **Track Progress** - Mark tasks complete and watch momentum build  

---

##  Quick Start

### Prerequisites

Before you begin, ensure you have:

| Requirement | Version | Notes |
|------------|---------|-------|
| **Node.js** | 18+ (20.x recommended) | Download from [nodejs.org](https://nodejs.org/) |
| **Python** | 3.11 or 3.12 | Avoid 3.14 (dependency issues) |
| **MongoDB Atlas** | Free tier | Sign up at [mongodb.com](https://www.mongodb.com/cloud/atlas) |
| **Google Cloud** | Free project | For OAuth + Calendar API |
| **Gemini API Key** | Free tier | Get from [ai.google.dev](https://ai.google.dev/) |

### Installation

#### Clone the Repository

```bash
git clone https://github.com/AAARRRCCC/AI-ATL-2025.git
cd AI-ATL-2025
```

#### Frontend Setup

Install dependencies:
```bash
npm install --legacy-peer-deps
```

> **Note:** `--legacy-peer-deps` is required due to React 19 RC

Create `.env.local` in the project root:
```env
# Database
MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/
MONGODB_DB_NAME=study-autopilot

# Authentication
JWT_SECRET=your-secret-key-min-32-chars-long
JWT_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### Backend Setup

Navigate to backend directory:
```bash
cd backend
```

Create virtual environment:
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

Install dependencies:
```bash
pip install -r requirements.txt
```

Create `backend/.env`:
```env
# Database
MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/

# AI
GEMINI_API_KEY=your-gemini-api-key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Security
JWT_SECRET=your-secret-key-min-32-chars-long

# Server
HOST=0.0.0.0
PORT=8000
FRONTEND_URL=http://localhost:3000
ENVIRONMENT=development
```

#### Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google Calendar API**
4. Configure **OAuth consent screen**
5. Create **OAuth 2.0 credentials** (Web application)
   - Authorized redirect URIs: `http://localhost:3000/api/auth/google/callback`
6. Copy Client ID and Client Secret to your `.env` files

### Running the Application

You'll need **two terminal windows**:

**Terminal 1 - Frontend (Next.js)**
```bash
npm run dev
```
Frontend: http://localhost:3000

**Terminal 2 - Backend (FastAPI)**
```bash
cd backend
# Activate venv first (see step 3)
python main.py
```
Backend: http://localhost:8000

### First-Time Usage

1. Visit **http://localhost:3000**
2. Click **"Get Started"** → Create account with email/password
3. Navigate to **Dashboard** → Click **"Connect Google Calendar"**
4. Complete Google OAuth flow
5. Go to **Preferences** → Set your study times and available days
6. Return to **Dashboard** → Start chatting with the AI!

**Example prompt:**
> "I have a research paper on machine learning due November 20th. It needs to be 15 pages with at least 10 sources."

---

##  Tech Stack

<div align="center">

### Frontend
![Next.js](https://img.shields.io/badge/Next.js-15.0.3-black?logo=next.js)
![React](https://img.shields.io/badge/React-19.0_RC-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css)

### Backend
![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?logo=fastapi)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python)
![Uvicorn](https://img.shields.io/badge/Uvicorn-ASGI-499848)

### Services & APIs
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb)
![Google Gemini](https://img.shields.io/badge/Google-Gemini_AI-4285F4?logo=google)
![Google Calendar](https://img.shields.io/badge/Google-Calendar_API-4285F4?logo=google-calendar)

</div>

### Key Libraries

**Frontend:**
- **React Big Calendar** - Interactive drag-and-drop calendar UI
- **Framer Motion** - Smooth animations and transitions
- **React Markdown** - Rich text rendering in chat messages
- **Lucide React** - Beautiful icon library
- **React Hot Toast** - Elegant notification system

**Backend:**
- **Motor** - Async MongoDB driver for Python
- **Google Generative AI** - Gemini API integration
- **Python-Jose** - JWT token handling
- **Passlib + Bcrypt** - Secure password hashing
- **Uvicorn** - High-performance ASGI server with WebSocket support

---

## Project Structure

```
AI-ATL-2025/
├── 📁 app/                        # Next.js App Router
│   ├── 📁 api/                    # API Routes (Next.js endpoints)
│   │   ├── auth/                  # Login, signup, Google OAuth
│   │   ├── calendar/              # Calendar CRUD operations
│   │   ├── assignments/           # Assignment management
│   │   ├── tasks/                 # Task operations
│   │   └── preferences/           # User settings
│   ├── 📁 auth/                   # Authentication UI
│   ├── 📁 dashboard/              # Main app (protected route)
│   ├── 📁 preferences/            # Settings page
│   ├── layout.tsx                 # Root layout with providers
│   ├── page.tsx                   # Landing page
│   └── globals.css                # Global styles + Tailwind
│
├── 📁 backend/                    # FastAPI Backend
│   ├── ai/
│   │   ├── chat_handler.py        # Gemini chat integration
│   │   └── functions.py           # AI function declarations
│   ├── auth/                      # Auth utilities
│   ├── database/                  # MongoDB connection
│   ├── models/                    # Pydantic models
│   ├── services/
│   │   └── function_executor.py   # Executes AI function calls
│   ├── main.py                    # FastAPI app + WebSocket
│   └── requirements.txt
│
├── 📁 components/                 # React Components
│   ├── Calendar.tsx               # Drag-drop calendar
│   ├── CalendarSection.tsx        # Calendar with event loading
│   ├── GoogleCalendarButton.tsx   # OAuth connection
│   ├── chat/                      # Chat interface components
│   └── ui/                        # Reusable UI components
│
├── 📁 lib/                        # Utilities
│   ├── auth.ts                    # JWT + bcrypt helpers
│   ├── google-calendar.ts         # Calendar API wrapper
│   ├── mongodb.ts                 # Database connection
│   └── utils.ts                   # General utilities
│
├── 📁 docs/                       # Documentation
│   ├── API_REFERENCE.md           # Complete API docs
│   ├── ARCHITECTURE.md            # System design
│   ├── IMPLEMENTATION_STATUS.md   # Feature tracking
│   └── TODO.md                    # Task list
│
└── 📄 package.json                # Dependencies
```

---

## Documentation

| Document | Description |
|----------|-------------|
| **[IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)** | What's working, what's in progress |
| **[API_REFERENCE.md](API_REFERENCE.md)** | Complete endpoint documentation |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | System design and data flow |
| **[DEVELOPMENT.md](DEVELOPMENT.md)** | Development guide and patterns |
| **[TODO.md](TODO.md)** | Prioritized task list |
| **[DEMO.md](DEMO.md)** | Step-by-step demo presentation guide |

---

## Development

### Available Commands

```bash
# Frontend Development
npm run dev          # Start dev server (localhost:3000)
npm run build        # Create production build
npm start            # Run production server
npm run lint         # Run ESLint

# Backend Development
cd backend
python main.py       # Start FastAPI server (localhost:8000)
```

### Environment Variables

Both frontend (`.env.local`) and backend (`backend/.env`) require configuration. See [Quick Start](#-quick-start) for complete setup instructions.

### Code Style

- **TypeScript** - Strict type checking enabled
- **ESLint** - Next.js recommended config
- **Prettier** - Automatic code formatting (configured via ESLint)
- **Tailwind CSS** - Utility-first styling approach

---

## Team & Credits

**Built for:** AI ATL 2025 Hackathon
By Ryan Brady, Elijah Borum, and Riley Pruitt (with the help of Claude Code)

**Powered by:**
- [Google Gemini](https://ai.google.dev/) - AI language model
- [Google Calendar API](https://developers.google.com/calendar) - Calendar integration
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) - Database hosting
- [Vercel](https://vercel.com/) - Deployment platform (Next.js)

**Special Thanks:**
- AI ATL organizers for the opportunity
- Google for Gemini API access

---

<div align="center">
Built with ❤️ and Moe's Tofu Burritos for the AI ATL 2025 Hackathon

</div>


