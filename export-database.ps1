# Script PowerShell per esportare il database FinTrack
# Esegui questo script su Windows per creare il backup del database

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  EXPORT DATABASE FINTRACK" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Configurazione
$BACKUP_FILE = "fintrack_backup.sql"
$BACKUP_PATH = Join-Path $PSScriptRoot $BACKUP_FILE
$DB_NAME = "fintrack"
$DB_USER = "postgres"

# Trova PostgreSQL
$PG_PATHS = @(
    "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\14\bin\pg_dump.exe",
    "C:\Program Files (x86)\PostgreSQL\16\bin\pg_dump.exe",
    "C:\Program Files (x86)\PostgreSQL\15\bin\pg_dump.exe"
)

$PG_DUMP = $null
foreach ($path in $PG_PATHS) {
    if (Test-Path $path) {
        $PG_DUMP = $path
        Write-Host "[✓] Trovato PostgreSQL in: $path" -ForegroundColor Green
        break
    }
}

if (-not $PG_DUMP) {
    Write-Host "[✗] ERRORE: pg_dump.exe non trovato!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Soluzione:" -ForegroundColor Yellow
    Write-Host "1. Usa pgAdmin per esportare manualmente" -ForegroundColor Yellow
    Write-Host "2. Oppure trova manualmente pg_dump.exe e aggiorna il percorso in questo script" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Premi Invio per uscire"
    exit 1
}

Write-Host ""
Write-Host "[i] Database: $DB_NAME" -ForegroundColor Cyan
Write-Host "[i] User: $DB_USER" -ForegroundColor Cyan
Write-Host "[i] Output: $BACKUP_PATH" -ForegroundColor Cyan
Write-Host ""

# Rimuovi vecchio backup se esiste
if (Test-Path $BACKUP_PATH) {
    Write-Host "[i] Rimuovo vecchio backup..." -ForegroundColor Yellow
    Remove-Item $BACKUP_PATH -Force
}

# Esporta
Write-Host "[→] Esportazione in corso..." -ForegroundColor Cyan
Write-Host "[i] Ti verrà chiesta la password di PostgreSQL" -ForegroundColor Yellow
Write-Host ""

try {
    & $PG_DUMP -U $DB_USER -d $DB_NAME -f $BACKUP_PATH --encoding=UTF8 --no-owner --no-acl
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "[✓] ESPORTAZIONE COMPLETATA CON SUCCESSO!" -ForegroundColor Green
        Write-Host ""
        
        # Verifica dimensione file
        if (Test-Path $BACKUP_PATH) {
            $fileSize = (Get-Item $BACKUP_PATH).Length
            $fileSizeKB = [math]::Round($fileSize / 1KB, 2)
            $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
            
            Write-Host "[✓] File creato: $BACKUP_FILE" -ForegroundColor Green
            if ($fileSizeMB -gt 1) {
                Write-Host "[✓] Dimensione: $fileSizeMB MB" -ForegroundColor Green
            } else {
                Write-Host "[✓] Dimensione: $fileSizeKB KB" -ForegroundColor Green
            }
            Write-Host "[✓] Percorso completo: $BACKUP_PATH" -ForegroundColor Green
            Write-Host ""
            Write-Host "=====================================" -ForegroundColor Cyan
            Write-Host "  PROSSIMI PASSI" -ForegroundColor Cyan
            Write-Host "=====================================" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "1. Trasferisci il file sul Raspberry Pi:" -ForegroundColor White
            Write-Host "   scp $BACKUP_FILE pi@IP_RASPBERRY:/home/pi/" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "2. Oppure copia il file su una chiavetta USB" -ForegroundColor White
            Write-Host ""
            Write-Host "3. Segui le istruzioni in MIGRAZIONE-DB-RASPBERRY.md" -ForegroundColor White
            Write-Host ""
        } else {
            Write-Host "[✗] ERRORE: File non creato!" -ForegroundColor Red
        }
    } else {
        Write-Host ""
        Write-Host "[✗] ERRORE durante l'esportazione!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Possibili cause:" -ForegroundColor Yellow
        Write-Host "- Password errata" -ForegroundColor Yellow
        Write-Host "- Database 'fintrack' non esiste" -ForegroundColor Yellow
        Write-Host "- PostgreSQL non in esecuzione" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Prova a usare pgAdmin per l'esportazione manuale" -ForegroundColor Yellow
        Write-Host ""
    }
} catch {
    Write-Host ""
    Write-Host "[✗] ERRORE: $_" -ForegroundColor Red
    Write-Host ""
}

Write-Host ""
Read-Host "Premi Invio per uscire"

