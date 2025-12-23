@echo off
REM Kitchen Display - Kiosk Mode Launcher
REM This script launches the Kitchen Display System in Chrome Kiosk Mode
REM with automatic silent printing enabled.

echo ========================================
echo   Kitchen Display - Kiosk Mode
echo ========================================
echo.
echo Starting Kitchen Display System...
echo Auto-Print: ENABLED
echo Mode: Full Screen Kiosk
echo.
echo Press Alt+F4 to exit kiosk mode
echo ========================================
echo.

REM Launch Chrome in kiosk mode with auto-print
REM Adjust the URL below if using a different port or deployed domain
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk-printing --app=http://localhost:3000/admin/kitchen

REM Alternative for deployed production app:
REM start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk-printing --app=https://your-domain.com/admin/kitchen

echo Kitchen Display launched successfully!
echo.
pause
