@echo off
REM Kill process on port 5000
echo Checking for processes on port 5000...

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5000" ^| findstr "LISTENING"') do (
    echo Killing process PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)

timeout /t 2 /nobreak >nul
echo Port 5000 is now free
