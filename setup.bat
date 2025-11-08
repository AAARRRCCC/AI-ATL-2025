@echo off
REM ============================================================================
REM Study Autopilot - Windows Setup Script
REM ============================================================================
REM This script automates the setup process for the Study Autopilot project
REM Run this script from the project root directory
REM ============================================================================

echo.
echo ============================================
echo   Study Autopilot - Windows Setup
echo ============================================
echo.

REM Check if Node.js is installed
echo [1/6] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found!
    echo Please install Node.js 18 or higher from https://nodejs.org/
    echo.
    pause
    exit /b 1
)
for /f "delims=" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION% detected
echo.

REM Check if Python is installed
echo [2/6] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found!
    echo Please install Python 3.10 or higher from https://python.org/
    echo.
    pause
    exit /b 1
)
for /f "delims=" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo [OK] %PYTHON_VERSION% detected
echo.

REM Install frontend dependencies
echo [3/6] Installing frontend dependencies...
echo This may take a few minutes...
call npm install --legacy-peer-deps
if errorlevel 1 (
    echo [ERROR] Failed to install frontend dependencies
    pause
    exit /b 1
)
echo [OK] Frontend dependencies installed
echo.

REM Setup Python virtual environment
echo [4/6] Setting up Python virtual environment...
cd backend
if exist venv (
    echo Virtual environment already exists, skipping creation...
) else (
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment
        cd ..
        pause
        exit /b 1
    )
    echo [OK] Virtual environment created
)

echo Activating virtual environment and installing dependencies...
call venv\Scripts\activate.bat
pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install Python dependencies
    cd ..
    pause
    exit /b 1
)
echo [OK] Python dependencies installed
cd ..
echo.

REM Setup environment files
echo [5/6] Setting up environment files...
if not exist .env.local (
    copy .env.example .env.local >nul 2>&1
    echo [CREATED] .env.local - Please configure your API keys!
) else (
    echo [EXISTS] .env.local already exists
)

if not exist backend\.env (
    copy backend\.env.example backend\.env >nul 2>&1
    echo [CREATED] backend\.env - Please configure your API keys!
) else (
    echo [EXISTS] backend\.env already exists
)
echo.

REM Final instructions
echo [6/6] Setup complete!
echo.
echo ============================================
echo   Next Steps
echo ============================================
echo.
echo 1. Configure your environment files:
echo    - Edit .env.local (frontend environment variables)
echo    - Edit backend\.env (backend environment variables)
echo.
echo 2. Required API Keys:
echo    - MONGODB_URI (MongoDB Atlas connection string)
echo    - GEMINI_API_KEY (Google AI Studio)
echo    - GOOGLE_CLIENT_ID (Google Cloud Console)
echo    - GOOGLE_CLIENT_SECRET (Google Cloud Console)
echo    - JWT_SECRET (generate with: openssl rand -hex 32)
echo.
echo 3. Start the application:
echo.
echo    Terminal 1 - Frontend:
echo    $ npm run dev
echo.
echo    Terminal 2 - Backend:
echo    $ cd backend
echo    $ venv\Scripts\activate
echo    $ python main.py
echo.
echo 4. Access the app:
echo    - Frontend: http://localhost:3000
echo    - Backend:  http://localhost:8000
echo.
echo For detailed instructions, see SETUP.md
echo.
echo ============================================
echo.
pause
