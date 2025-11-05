#!/bin/bash
cd "$(dirname "$0")/../.."

echo "🛑 Arresto ambiente di sviluppo FinTrack..."

docker compose -p fintrack-dev down

echo "✅ Ambiente di sviluppo arrestato!"
