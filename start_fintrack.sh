#!/bin/bash

echo "=== FinTrack launcher ==="
echo

# 1) Verifica Docker
if ! docker info >/dev/null 2>&1; then
  echo "[ERRORE] Docker non risulta in esecuzione. Avvialo e riprova."
  echo "Suggerimento: sudo systemctl start docker (o avvia Docker Desktop)"
  exit 1
fi

# 2) Avvia/crea sempre lo stesso DB Postgres su porta 5432
DB_NAME="fintrack-db"
DB_PORT="5432"

if ! docker ps -a --filter "name=^/${DB_NAME}$" --format "{{.Names}}" | grep -q "^${DB_NAME}$"; then
  echo "[+] Creo il container ${DB_NAME} su porta ${DB_PORT} ..."
  docker run --name ${DB_NAME} -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=fintrack -p ${DB_PORT}:5432 -d postgres:14
elif ! docker ps --filter "name=^/${DB_NAME}$" --format "{{.Names}}" | grep -q "^${DB_NAME}$"; then
  echo "[+] Avvio il container ${DB_NAME} ..."
  docker start ${DB_NAME} >/dev/null
else
  echo "[+] Il container ${DB_NAME} è già in esecuzione."
fi

# Facoltativo: ferma altri vecchi container che potrebbero occupare 5432
docker stop fintrack-postgres >/dev/null 2>&1

# 2b) Attendi che Postgres accetti connessioni
echo "[+] Attendo che Postgres sia pronto..."
READY=0
for i in {1..60}; do
  if docker exec ${DB_NAME} sh -c "pg_isready -U postgres" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 1
done

if [ "$READY" = "0" ]; then
  echo "[ERRORE] Postgres non è pronto dopo 60 secondi. Controlla Docker e riprova."
  exit 1
fi

echo "    -> Postgres pronto."

# 3) Scrivi/aggiorna server/.env coerente con il DB standard
SERVER_ENV="$(dirname "$0")/server/.env"
cat > "${SERVER_ENV}" << EOF
DATABASE_URL=postgresql://postgres:postgres@localhost:${DB_PORT}/fintrack?schema=public
JWT_SECRET=change_me_dev_secret
PORT=4000
NODE_ENV=development
ALLOW_DEMO_SEED=true
EOF

# 4) Avvia backend e frontend in background
echo "[+] Avvio backend..."
cd "$(dirname "$0")/server"
npm install --silent --no-fund
npx prisma generate
npx prisma migrate deploy
npm run dev &
SERVER_PID=$!

echo "[+] Avvio frontend..."
cd "$../client"
npm install --silent --no-fund
npm run dev &
CLIENT_PID=$!

echo
echo "Avviati server e client in background."
echo "Server PID: $SERVER_PID"
echo "Client PID: $CLIENT_PID"
echo
echo "Per fermare l'app, esegui:"
echo "kill $SERVER_PID $CLIENT_PID"
echo
echo "Oppure premi Ctrl+C per fermare questo script (fermerà anche server e client)"

# Funzione per cleanup al termine
cleanup() {
  echo
  echo "Fermando server e client..."
  kill $SERVER_PID $CLIENT_PID 2>/dev/null
  exit 0
}

# Cattura segnali per cleanup
trap cleanup SIGINT SIGTERM

# Attendi che l'utente prema Ctrl+C
wait
