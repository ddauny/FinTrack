#!/bin/sh
set -e

echo "Eseguo migrazioni Prisma..."
npx prisma migrate deploy

echo "Avvio server Node..."
node dist/index.js
