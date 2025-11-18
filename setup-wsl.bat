@echo off
REM ############################################################################
REM EchoTune AI - WSL Setup Launcher for Windows
REM Run this from Windows to setup in WSL Ubuntu
REM ############################################################################

echo.
echo ========================================
echo EchoTune AI - WSL Setup Launcher
echo ========================================
echo.

REM Check if WSL is installed
wsl --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] WSL is not installed!
    echo.
    echo Please install WSL first:
    echo   1. Open PowerShell as Administrator
    echo   2. Run: wsl --install
    echo   3. Restart your computer
    echo   4. Run this script again
    echo.
    pause
    exit /b 1
)

echo [OK] WSL is installed
echo.

REM Check if Ubuntu is installed
wsl -l -v | findstr Ubuntu >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Ubuntu not found in WSL
    echo.
    echo Installing Ubuntu...
    wsl --install -d Ubuntu-22.04
    echo.
    echo Please restart your computer and run this script again.
    pause
    exit /b 0
)

echo [OK] Ubuntu is installed
echo.

REM Get the current directory in Windows format
set "CURRENT_DIR=%cd%"

REM Convert Windows path to WSL path
for /f "tokens=*" %%i in ('wsl wslpath -a "%CURRENT_DIR%"') do set WSL_PATH=%%i

echo Starting WSL setup script...
echo Location: %WSL_PATH%
echo.

REM Run the setup script in WSL
wsl -d Ubuntu bash -c "cd '%WSL_PATH%' && chmod +x setup-wsl.sh && ./setup-wsl.sh"

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo Setup completed successfully!
    echo ========================================
    echo.
    echo You can now access your app from Windows at:
    echo   http://localhost:3000
    echo.
    echo To start the server, run in WSL:
    echo   wsl -d Ubuntu
    echo   cd %WSL_PATH%
    echo   npm start
    echo.
) else (
    echo.
    echo ========================================
    echo Setup failed!
    echo ========================================
    echo.
    echo Please check the error messages above.
    echo For help, see SETUP-WSL.md
    echo.
)

pause
