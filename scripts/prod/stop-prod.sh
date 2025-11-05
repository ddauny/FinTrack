#!/bin/bash
cd "$(dirname "$0")/../.."

echo "🛑 Arresto ambiente di produzione FinTrack..."

docker compose -f docker-compose.prod.yml -p fintrack-prod down

echo "✅ Ambiente di produzione arrestato!"
