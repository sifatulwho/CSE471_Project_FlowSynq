@echo off
REM Render Deployment Verification Script for Windows
REM This script checks if your project is ready for Render deployment

setlocal enabledelayedexpansion

echo ================================
echo Flowsynq Render Deployment Check
echo ================================
echo.

set /a checks_passed=0
set /a checks_failed=0
set /a checks_warning=0

echo 1. Checking Project Structure...
echo ================================
if exist "package.json" (
    echo [OK] Root package.json exists
    set /a checks_passed+=1
) else (
    echo [FAIL] Root package.json missing
    set /a checks_failed+=1
)

if exist "server.js" (
    echo [OK] server.js exists
    set /a checks_passed+=1
) else (
    echo [FAIL] server.js missing
    set /a checks_failed+=1
)

if exist "frontend\package.json" (
    echo [OK] Frontend package.json exists
    set /a checks_passed+=1
) else (
    echo [FAIL] Frontend package.json missing
    set /a checks_failed+=1
)

if exist ".gitignore" (
    echo [OK] .gitignore file exists
    set /a checks_passed+=1
) else (
    echo [FAIL] .gitignore file missing
    set /a checks_failed+=1
)

echo.
echo 2. Checking for .env file (should NOT be committed)...
echo ================================================
if exist ".env" (
    echo [WARNING] .env file exists locally (make sure it's in .gitignore)
    set /a checks_warning+=1
) else (
    echo [OK] .env file not tracked
    set /a checks_passed+=1
)

echo.
echo 3. Checking Server Configuration...
echo ==================================
findstr /M "process.env.PORT" server.js >nul
if !ERRORLEVEL! equ 0 (
    echo [OK] Environment variable PORT usage found
    set /a checks_passed+=1
) else (
    echo [WARNING] Environment variable PORT usage not found
    set /a checks_warning+=1
)

findstr /M "process.env.MONGODB_URI" server.js >nul
if !ERRORLEVEL! equ 0 (
    echo [OK] Environment variable MONGODB_URI usage found
    set /a checks_passed+=1
) else (
    echo [WARNING] Environment variable MONGODB_URI usage not found
    set /a checks_warning+=1
)

findstr /M "app.get.*health" server.js >nul
if !ERRORLEVEL! equ 0 (
    echo [OK] Health check endpoint found
    set /a checks_passed+=1
) else (
    echo [WARNING] Health check endpoint not found
    set /a checks_warning+=1
)

echo.
echo 4. Checking Frontend Build Setup...
echo ==================================
if exist "frontend\vite.config.js" (
    echo [OK] Vite config exists
    set /a checks_passed+=1
) else (
    echo [WARNING] Vite config not found
    set /a checks_warning+=1
)

if exist "frontend\src" (
    echo [OK] Frontend source directory exists
    set /a checks_passed+=1
) else (
    echo [FAIL] Frontend source directory missing
    set /a checks_failed+=1
)

findstr /M "build" frontend\package.json >nul
if !ERRORLEVEL! equ 0 (
    echo [OK] Build script found
    set /a checks_passed+=1
) else (
    echo [WARNING] Build script not found
    set /a checks_warning+=1
)

echo.
echo 5. Checking Python Services...
echo =============================
if exist "optimization_service\requirements.txt" (
    echo [OK] optimization_service requirements.txt exists
    set /a checks_passed+=1
) else (
    echo [WARNING] optimization_service requirements.txt not found
    set /a checks_warning+=1
)

if exist "optimization_service\main.py" (
    echo [OK] optimization_service main.py exists
    set /a checks_passed+=1
) else (
    echo [WARNING] optimization_service main.py not found
    set /a checks_warning+=1
)

if exist "optimization_service\analytics_service.py" (
    echo [OK] analytics_service.py exists
    set /a checks_passed+=1
) else (
    echo [WARNING] analytics_service.py not found
    set /a checks_warning+=1
)

echo.
echo 6. Checking Deployment Documentation...
echo =======================================
if exist "RENDER_DEPLOYMENT_GUIDE.md" (
    echo [OK] RENDER_DEPLOYMENT_GUIDE.md exists
    set /a checks_passed+=1
) else (
    echo [WARNING] RENDER_DEPLOYMENT_GUIDE.md missing
    set /a checks_warning+=1
)

if exist "DEPLOYMENT_CHECKLIST.md" (
    echo [OK] DEPLOYMENT_CHECKLIST.md exists
    set /a checks_passed+=1
) else (
    echo [WARNING] DEPLOYMENT_CHECKLIST.md missing
    set /a checks_warning+=1
)

if exist "RENDER_QUICK_START.md" (
    echo [OK] RENDER_QUICK_START.md exists
    set /a checks_passed+=1
) else (
    echo [WARNING] RENDER_QUICK_START.md missing
    set /a checks_warning+=1
)

if exist "render.yaml" (
    echo [OK] render.yaml exists
    set /a checks_passed+=1
) else (
    echo [WARNING] render.yaml missing
    set /a checks_warning+=1
)

echo.
echo 7. Checking .gitignore Configuration...
echo ======================================
findstr /M "node_modules" .gitignore >nul
if !ERRORLEVEL! equ 0 (
    echo [OK] node_modules is in .gitignore
    set /a checks_passed+=1
) else (
    echo [FAIL] node_modules NOT in .gitignore
    set /a checks_failed+=1
)

findstr /M ".env" .gitignore >nul
if !ERRORLEVEL! equ 0 (
    echo [OK] .env is in .gitignore
    set /a checks_passed+=1
) else (
    echo [FAIL] .env NOT in .gitignore
    set /a checks_failed+=1
)

echo.
echo ================================
echo Deployment Readiness Summary
echo ================================
echo Passed: %checks_passed%
echo Warnings: %checks_warning%
echo Failed: %checks_failed%
echo.

if %checks_failed% equ 0 (
    if %checks_warning% leq 2 (
        echo [SUCCESS] Your project is ready for Render deployment!
        echo.
        echo Next steps:
        echo 1. Push your code to GitHub
        echo 2. Follow RENDER_QUICK_START.md
        echo 3. Create services on Render dashboard
        exit /b 0
    ) else (
        echo [WARNING] Your project has some warnings but can be deployed
        echo Review the warnings above before deploying
        exit /b 1
    )
) else (
    echo [ERROR] Your project has issues that need to be fixed first
    echo Please resolve the failed checks above
    exit /b 1
)
