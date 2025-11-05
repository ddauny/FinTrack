#!/bin/bash
cd "$(dirname "$0")/../.."

echo "🚀 Avvio ambiente di sviluppo FinTrack..."

if [ ! -f ".env.dev" ]; then
    echo "❌ Errore: File .env.dev non trovato!"
    exit 1
fi

docker compose -p fintrack-dev up -d --build

echo "⏳ Attendo che i servizi siano pronti..."
sleep 5

echo "
✅ Ambiente di sviluppo avviato!"
echo "
📍 Servizi disponibili:"
echo "   - Frontend:  http://localhost:5173"
echo "   - Backend:   http://localhost:4000"
echo "   - Database:  localhost:5432"
echo "
📋 Per vedere i log:"
echo "   docker compose -p fintrack-dev logs -f"
echo "
🛑 Per fermare:"
echo "   ./scripts/dev/stop-dev.sh"
