@echo off
setlocal enabledelayedexpansion

echo === FinTrack launcher ===
echo.

rem 1) Verifica Docker
docker info >nul 2>&1
if errorlevel 1 (
  echo [ERRORE] Docker Desktop non risulta in esecuzione. Avvialo e riprova.
  echo Suggerimento: apri Docker Desktop, attendi il "running" e rilancia questo .bat
  pause
  goto :eof
)

rem 2) Avvia/crea sempre lo stesso DB Postgres su porta 5432
set "DB_NAME=fintrack-db"
set "DB_PORT=5432"
set EXISTS=
set RUNNING=
for /f "usebackq delims=" %%i in (`docker ps -a --filter "name=^/%DB_NAME%$" --format "{{.Names}}"`) do set EXISTS=1
for /f "usebackq delims=" %%i in (`docker ps --filter "name=^/%DB_NAME%$" --format "{{.Names}}"`) do set RUNNING=1

if not defined EXISTS (
  echo [+] Creo il container %DB_NAME% su porta %DB_PORT% ...
  docker run --name %DB_NAME% -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=fintrack -p %DB_PORT%:5432 -d postgres:14
) else if not defined RUNNING (
  echo [+] Avvio il container %DB_NAME% ...
  docker start %DB_NAME% >nul
) else (
  echo [+] Il container %DB_NAME% e' gia' in esecuzione.
)

rem Facoltativo: ferma altri vecchi container che potrebbero occupare 5432
docker stop fintrack-postgres >nul 2>&1

rem 2b) Attendi che Postgres accetti connessioni
echo [+] Attendo che Postgres sia pronto...
set READY=0
for /L %%i in (1,1,60) do (
  docker exec %DB_NAME% sh -c "pg_isready -U postgres" >nul 2>&1
  if not errorlevel 1 (
    set READY=1
    goto :db_ready
  )
  timeout /t 1 >nul
)
:
if "%READY%"=="0" (
  echo [ERRORE] Postgres non e' pronto dopo 60 secondi. Controlla Docker e riprova.
  pause
  goto :eof
)
:db_ready
echo     -> Postgres pronto.

rem 3) Scrivi/aggiorna server/.env coerente con il DB standard
set "SERVER_ENV=%~dp0server\.env"
echo DATABASE_URL=postgresql://postgres:postgres@localhost:%DB_PORT%/fintrack?schema=public> "%SERVER_ENV%"
echo PORT=4000>> "%SERVER_ENV%"

rem 4) Avvia backend e frontend in finestre separate
start "FinTrack Server" cmd /k "cd /d %~dp0server && npm install --silent --no-fund && npx prisma generate && npx prisma migrate deploy && npm run dev"
start "FinTrack Web" cmd /k "cd /d %~dp0client && npm install --silent --no-fund && npm run dev"

echo.
echo Avviati server e client in due finestre separate. Questo terminale puo' essere chiuso.
exit /b 0


