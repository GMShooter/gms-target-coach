@echo off
REM GMShooter v2 Deployment Script for Windows
REM This script helps deploy the frontend and backend components

setlocal enabledelayedexpansion

echo.
echo 🚀 Starting GMShooter v2 Deployment...
echo.

REM Check if required tools are installed
:check_requirements
echo 📋 Checking requirements...

where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ npm is not installed. Please install Node.js and npm.
    pause
    exit /b 1
)

where supabase >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ Supabase CLI is not installed. Installing...
    npm install -g supabase
)

where firebase >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ Firebase CLI is not installed. Installing...
    npm install -g firebase-tools
)

echo ✅ All requirements met
echo.

REM Setup environment variables
:setup_env
echo 🔧 Setting up environment...

if not exist .env (
    if exist .env.example (
        copy .env.example .env >nul
        echo 📝 Created .env file from .env.example
        echo ⚠️  Please update the environment variables in .env before continuing
        echo Press Enter to continue or Ctrl+C to exit...
        pause >nul
    ) else (
        echo ❌ .env.example file not found
        pause
        exit /b 1
    )
)

echo ✅ Environment setup complete
echo.

REM Check if we should run interactive mode
if "%1"=="" goto interactive_mode
if "%1"=="supabase" goto deploy_supabase
if "%1"=="frontend" goto deploy_frontend
if "%1"=="test" goto run_tests
if "%1"=="help" goto show_help
goto interactive_mode

:interactive_mode
echo What would you like to deploy?
echo 1) Backend (Supabase) only
echo 2) Frontend only
echo 3) Both (recommended)
echo 4) Run tests only
echo 5) Full deployment with tests
echo.

set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" goto deploy_supabase
if "%choice%"=="2" goto deploy_frontend
if "%choice%"=="3" goto deploy_both
if "%choice%"=="4" goto run_tests
if "%choice%"=="5" goto deploy_full

echo ❌ Invalid choice
pause
exit /b 1

:deploy_supabase
echo 🗄️  Deploying Supabase backend...

cd supabase

REM Check if Supabase is linked
supabase status >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo 🔗 Linking to Supabase project...
    supabase link
)

REM Push database schema
echo 📊 Pushing database schema...
supabase db push

REM Deploy Edge Functions
echo ⚡ Deploying Edge Functions...
supabase functions deploy --no-verify-jwt

REM Set secrets
if defined ROBOFLOW_API_KEY (
    echo 🔐 Setting Roboflow API key...
    supabase secrets set ROBOFLOW_API_KEY=%ROBOFLOW_API_KEY%
)

cd ..
echo ✅ Supabase deployment complete
echo.
goto end

:deploy_frontend
echo 🎨 Building and deploying frontend...

REM Install dependencies
echo 📦 Installing dependencies...
npm install

REM Build the application
echo 🔨 Building application...
npm run build

REM Deploy to Firebase Hosting
echo 🌐 Deploying to Firebase Hosting...
firebase deploy --only hosting

echo ✅ Frontend deployment complete
echo.
goto end

:deploy_both
call :deploy_supabase
call :deploy_frontend
goto end

:run_tests
echo 🧪 Running tests...

if exist package.json (
    findstr /C:"test" package.json >nul
    if !ERRORLEVEL! equ 0 (
        npm test -- --watchAll=false
    ) else (
        echo ⚠️  No tests found
    )
) else (
    echo ⚠️  package.json not found
)

echo ✅ Tests complete
echo.
goto end

:deploy_full
call :run_tests
call :deploy_supabase
call :deploy_frontend
goto end

:show_help
echo Usage: %0 [command]
echo.
echo Commands:
echo   supabase   Deploy Supabase backend only
echo   frontend   Deploy frontend only
echo   test       Run tests only
echo   help       Show this help message
echo.
echo If no command is provided, the interactive deployment wizard will start.
goto end

:end
echo.
echo 🎉 Deployment completed successfully!
echo.
echo Next steps:
echo 1. Update your environment variables if not already done
echo 2. Test the application at your Firebase Hosting URL
echo 3. Monitor the Supabase dashboard for any issues
echo 4. Check the Edge Functions logs for debugging
echo.
echo Useful commands:
echo - View Supabase logs: supabase functions logs
echo - View database: supabase db studio
echo - Local development: npm start
echo.

pause