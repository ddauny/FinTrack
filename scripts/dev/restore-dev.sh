#!/bin/bash
cd "$(dirname "$0")/../.."

if [ -z "$1" ]; then
    echo "❌ Errore: Specifica il file di backup"
    echo "Uso: ./scripts/dev/restore-dev.sh percorso/al/backup.sql"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Errore: File $BACKUP_FILE non trovato!"
    exit 1
fi

echo "💾 Ripristino database di sviluppo da: $BACKUP_FILE"
echo ""
echo "⚠️  ATTENZIONE: Questa operazione cancellerà tutti i dati attuali!"
read -p "Continuare? (s/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "❌ Operazione annullata"
    exit 1
fi

docker compose -p fintrack-dev down

docker volume rm fintrack-dev-data 2>/dev/null || true

docker compose -p fintrack-dev up -d db-dev

echo "⏳ Attendo che il database sia pronto..."
sleep 10

docker cp "$BACKUP_FILE" fintrack-dev-db:/tmp/restore.sql

docker exec -i fintrack-dev-db psql -U postgres -d fintrack < "$BACKUP_FILE"

docker compose -p fintrack-dev up -d --build

echo "
✅ Ripristino completato!"
echo "
📍 L'ambiente di sviluppo è ora disponibile con i dati ripristinati"
