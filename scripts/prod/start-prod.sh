#!/bin/bash
cd "$(dirname "$0")/../.."

echo "🚀 Avvio ambiente di produzione FinTrack..."

if [ ! -f ".env.prod" ]; then
    echo "❌ Errore: File .env.prod non trovato!"
    exit 1
fi

mkdir -p backups

docker compose -f docker-compose.prod.yml -p fintrack-prod up -d --build

echo "⏳ Attendo che i servizi siano pronti..."
sleep 10

echo "
✅ Ambiente di produzione avviato!"
echo "
📍 L'applicazione è disponibile tramite il reverse proxy"
echo "
📋 Per vedere i log:"
echo "   docker compose -f docker-compose.prod.yml -p fintrack-prod logs -f"
echo "
💾 Backup automatici salvati in: ./backups/"
echo "
🛑 Per fermare:"
echo "   ./scripts/prod/stop-prod.sh"
