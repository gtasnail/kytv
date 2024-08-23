@echo off
REM 

echo Setting up the Node.js application...

REM 
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js is not installed. Please install Node.js and npm, then run this script again.
    exit /b 1
)

REM 
if not exist .env (
    echo Creating .env file...
    echo PORT=3000> .env
    echo NODE_ENV=development>> .env
    REM 
)

REM 
echo Installing project dependencies...
call npm install

REM 
echo Building the React app...
call npm run build

REM 
echo Starting the server...
call npm start

pause