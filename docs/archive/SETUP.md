# Study Autopilot - Setup Guide (Windows)

Welcome to Study Autopilot! This guide will help you get the project running on your Windows machine.

## 📋 Prerequisites

Before you begin, ensure you have these installed on your Windows machine:

### Required Software

1. **Node.js** (v18 or higher)
   - Download from: https://nodejs.org/
   - Recommended: v22.21.0 (LTS)
   - Verify installation: `node --version`

2. **Python** (v3.11 or v3.12 RECOMMENDED)
   - Download from: https://python.org/
   - ⚠️ **IMPORTANT**: Use Python 3.11 or 3.12 - Python 3.14 has compatibility issues
   - ⚠️ Make sure to check "Add Python to PATH" during installation
   - Verify installation: `python --version`

3. **Git** (for cloning the repository)
   - Download from: https://git-scm.com/
   - Verify installation: `git --version`

### Optional but Recommended

4. **Visual Studio Code**
   - Download from: https://code.visualstudio.com/
   - Recommended extensions:
     - ESLint
     - Prettier
     - Python
     - Tailwind CSS IntelliSense

---

## 🚀 Quick Setup (Automated)

The easiest way to get started is to use our automated setup script:

```cmd
# From the project root directory
setup.bat
```

This script will:
- ✅ Check for Node.js and Python
- ✅ Install all frontend dependencies
- ✅ Create Python virtual environment
- ✅ Install all backend dependencies
- ✅ Create environment files (.env.local and backend/.env)

After running the script, proceed to **Step 3: Configure Environment Variables** below.

---

## 🔧 Manual Setup (Step by Step)

If you prefer to set things up manually or if the automated script fails:

### Step 1: Install Frontend Dependencies

```cmd
# From project root
npm install --legacy-peer-deps
```

**Note:** We use `--legacy-peer-deps` due to React 19 RC compatibility.

### Step 2: Install Backend Dependencies

```cmd
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
venv\Scripts\activate

# Install Python packages
pip install -r requirements.txt

# Go back to root
cd ..
```

### Step 3: Create Environment Files

```cmd
# Create frontend environment file
copy .env.example .env.local

# Create backend environment file
copy backend\.env.example backend\.env
```

---

## 🔑 Step 3: Configure Environment Variables

You'll need to obtain several API keys and configure your environment files.

### Frontend Environment (`.env.local`)

Open `.env.local` and configure:

```env
# MongoDB Configuration
MONGODB_URI=your-mongodb-connection-string
MONGODB_DB_NAME=study-autopilot

# JWT Authentication
JWT_SECRET=your-generated-secret-key
JWT_EXPIRES_IN=7d

# Google OAuth (for Calendar)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Backend Environment (`backend/.env`)

Open `backend/.env` and configure:

```env
# MongoDB Configuration
MONGODB_URI=your-mongodb-connection-string

# Google Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# JWT Secret (must match frontend)
JWT_SECRET=your-generated-secret-key

# Server Configuration
HOST=0.0.0.0
PORT=8000
FRONTEND_URL=http://localhost:3000
ENVIRONMENT=development
```

---

## 🔐 Obtaining API Keys

### 1. MongoDB Atlas (Database)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account or sign in
3. Create a new cluster (Free tier M0 is fine)
4. Click "Connect" → "Connect your application"
5. Copy the connection string
6. Replace `<password>` with your database password
7. Add to both `.env.local` and `backend/.env` as `MONGODB_URI`

**Example:**
```
mongodb+srv://username:password@cluster.mongodb.net/?appName=StudyAutopilot
```

### 2. Google Gemini API Key (AI)

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Select "Create API key in new project" (or use existing)
5. Copy the API key
6. Add to `backend/.env` as `GEMINI_API_KEY`

**Note:** Gemini API is free with generous rate limits!

### 3. Google OAuth (Calendar Integration)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable APIs:
   - Go to "APIs & Services" → "Library"
   - Search and enable "Google Calendar API"
4. Create OAuth credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Authorized redirect URIs: `http://localhost:3000/api/auth/google/callback`
   - Click "Create"
5. Copy the Client ID and Client Secret
6. Add to both `.env.local` and `backend/.env`

### 4. JWT Secret (Security)

Generate a random secret key:

```cmd
# Option 1: Using PowerShell
powershell -Command "[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))"

# Option 2: Use any random string generator
# Just make it long and random (32+ characters)
```

Add the same secret to both `.env.local` and `backend/.env` as `JWT_SECRET`.

---

## ▶️ Running the Application

You'll need **two terminal windows** running simultaneously.

### Terminal 1: Frontend (Next.js)

```cmd
# From project root
npm run dev
```

**Expected output:**
```
✓ Ready on http://localhost:3000
```

### Terminal 2: Backend (FastAPI)

```cmd
# From project root
cd backend
venv\Scripts\activate
python main.py
```

**Expected output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
MongoDB connected successfully
```

### Access the App

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs (Swagger UI)

---

## ✅ Verifying Your Setup

### Check Frontend
1. Open http://localhost:3000
2. You should see the landing page
3. Click "Get Started" or navigate to http://localhost:3000/auth
4. Try signing up with an email and password

### Check Backend
1. Open http://localhost:8000
2. You should see:
   ```json
   {"status":"ok","service":"Study Autopilot API","version":"1.0.0"}
   ```
3. Check the backend terminal - it should say "MongoDB connected successfully"

### Check Gemini AI
1. Open `backend/test_chat.html` directly in your browser (File → Open File)
2. Type a message like "Hello, what can you do?"
3. You should get an AI response

---

## 🐛 Troubleshooting

### "Node not found" or "Python not found"

- Make sure you installed Node.js and Python
- Restart your terminal/command prompt
- Check that they're added to your PATH environment variable

### "Cannot find module" errors (Frontend)

```cmd
# Delete node_modules and reinstall
rmdir /s /q node_modules
del package-lock.json
npm install --legacy-peer-deps
```

### "pip not found"

- Make sure you checked "Add Python to PATH" during Python installation
- Try using `python -m pip` instead of just `pip`

### Virtual environment activation fails

```cmd
# Make sure you're in the backend directory
cd backend

# Try activating with full path
venv\Scripts\activate.bat

# If still fails, recreate virtual environment
rmdir /s /q venv
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### MongoDB connection fails

- Check your `MONGODB_URI` is correct
- Make sure your IP is whitelisted in MongoDB Atlas
  - Go to Network Access → Add IP Address → Allow Access from Anywhere
- Verify your database password doesn't contain special characters that need URL encoding

### Port already in use

```cmd
# Check what's using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Same for port 8000
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Google OAuth not working

- Verify redirect URI is exactly: `http://localhost:3000/api/auth/google/callback`
- Check Google Cloud Console → Credentials → Your OAuth Client
- Make sure Calendar API is enabled
- Use `http://localhost:3000` (not `127.0.0.1`)

---

## 📂 Project Structure

```
AI ATL 2025/
├── app/                      # Next.js pages
│   ├── api/                  # API routes
│   ├── auth/                 # Authentication pages
│   └── dashboard/            # Dashboard page
├── backend/                  # FastAPI backend
│   ├── ai/                   # Gemini AI integration
│   ├── services/             # Business logic
│   ├── database/             # MongoDB connection
│   └── main.py              # FastAPI app
├── components/               # React components
├── lib/                      # Utilities
├── models/                   # Database models
├── .env.local               # Frontend environment
├── backend/.env             # Backend environment
├── package.json             # Node dependencies
└── setup.bat                # Windows setup script
```

---

## 🤝 Getting Help

If you're stuck:

1. Check this SETUP.md file
2. Read the error message carefully
3. Check the backend terminal logs
4. Ask the team in your chat/Slack
5. Check the GitHub issues

---

## 🎉 You're Ready!

Once you see both servers running without errors:

1. Visit http://localhost:3000
2. Create an account at http://localhost:3000/auth
3. Log in to the dashboard
4. Connect your Google Calendar
5. Start chatting with the AI to create assignments!

Happy coding! 🚀
