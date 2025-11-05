#!/bin/bash
cd "$(dirname "$0")/../.."

if [ -z "$1" ]; then
    echo "❌ Errore: Specifica il file di backup"
    echo "Uso: ./scripts/prod/restore-prod.sh percorso/al/backup.sql"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Errore: File $BACKUP_FILE non trovato!"
    exit 1
fi

if [ ! -f ".env.prod" ]; then
    echo "❌ Errore: File .env.prod non trovato!"
    exit 1
fi

source .env.prod

echo "💾 Ripristino database di PRODUZIONE da: $BACKUP_FILE"
echo ""
echo "⚠️  ATTENZIONE: Questa operazione cancellerà tutti i dati di PRODUZIONE!"
echo "⚠️  Assicurati di aver fatto un backup prima di procedere!"
read -p "Continuare? (s/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "❌ Operazione annullata"
    exit 1
fi

docker compose -f docker-compose.prod.yml -p fintrack-prod down

docker volume rm fintrack-prod-data 2>/dev/null || true

docker compose -f docker-compose.prod.yml -p fintrack-prod up -d db

echo "⏳ Attendo che il database sia pronto..."
sleep 10

docker cp "$BACKUP_FILE" fintrack-prod-db:/tmp/restore.sql

docker exec -i fintrack-prod-db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$BACKUP_FILE"

docker compose -f docker-compose.prod.yml -p fintrack-prod up -d --build

echo "
✅ Ripristino completato!"
echo "
📍 L'ambiente di produzione è ora disponibile con i dati ripristinati"
