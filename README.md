# 🚀 FinTrack Project Setup Guide

Gestione completa per sviluppo e produzione con Docker Compose.

---

## Prerequisiti

- **Docker** e **Docker Compose** installati
- Cartella `scripts/` creata e script resi eseguibili (`chmod +x scripts/*.sh`)
- File `.env.dev` e `.env.prod` compilati correttamente

---

## Struttura del Progetto

```text
FinTrack/
├── client/
├── server/
├── backups/
├── scripts/
│   ├── start-dev.sh
│   ├── stop-dev.sh
│   ├── restore-dev.sh
│   ├── start-prod.sh
│   ├── stop-prod.sh
│   ├── restore-prod.sh
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.dev
├── .env.prod
└── README.md
```

---

## Ambiente di Sviluppo

### Avvio
```bash
./scripts/start-dev.sh
```

### Arresto
```bash
./scripts/stop-dev.sh
```

### Ripristino database da backup
```bash
./scripts/restore-dev.sh backups/dev-backup-xxxx.sql
```

### Accesso Localhost
- **Frontend:** http://localhost:5173
- **API:** http://localhost:4000
- **Database:** localhost:5432

---

## Ambiente di Produzione

### Avvio
```bash
./scripts/start-prod.sh
```

### Arresto
```bash
./scripts/stop-prod.sh
```

### Ripristino database da backup
```bash
./scripts/restore-prod.sh backups/prod-backup-xxxx.sql
```

> L'applicazione prod sarà disponibile dal tuo reverse proxy su rete `web-proxy`.

---

## Gestione Backup

- Backup **automatici** giornalieri (`db-backup` in production)
- Backup **manuale** via:
```bash
docker exec fintrack-prod-db pg_dump -U [USER] -d [DB] > backups/prod-backup-$(date +%Y%m%d-%H%M%S).sql
```
> Sostituisci `[USER]` e `[DB]` con quelli del tuo `.env.prod`.

---

## Comandi Docker Compose utili

- **Log sviluppo:**  
  `docker compose -p fintrack-dev logs -f`

- **Log produzione:**  
  `docker compose -f docker-compose.prod.yml -p fintrack-prod logs -f`

- **Pulizia totale sviluppo:**  
  `docker compose -p fintrack-dev down -v --remove-orphans && docker volume rm fintrack-dev-data`

- **Pulizia totale produzione:**  
  `docker compose -f docker-compose.prod.yml -p fintrack-prod down -v --remove-orphans && docker volume rm fintrack-prod-data`

---

## Note Finali

- Non committare `.env.dev` e `.env.prod`
- Gli ambienti sono isolati e separati
- Consulta i singoli script nella cartella `/scripts` per dettagli extra

---

## Import transazioni da screenshot

La pagina **Transactions** include la funzione **"Import screenshot"**: carichi uno o più screenshot dell'app bancaria, il sistema estrae automaticamente data, esercente, importo e tipo (Income/Expense) tramite Google Gemini, suggerisce la categoria, segnala possibili duplicati e mostra un riepilogo editabile prima della conferma.

Per abilitarla, aggiungi la chiave API a `.env.dev` e `.env.prod` (lato server, mai esposta al client):

```bash
GEMINI_API_KEY=la-tua-chiave-google-ai-studio
```

Senza la chiave, gli endpoint `/api/transactions/extract` e `/api/transactions/bulk-import` rispondono `503`.
