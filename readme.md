# FinTrack - Guida alla Gestione in Produzione e Sviluppo

Benvenuto nella guida per l'avvio e la gestione dell'applicazione **FinTrack** in modalità produzione e sviluppo. Qui troverai tutte le informazioni necessarie per gestire entrambi gli ambienti.

---

## Concetti Chiave

- **Immagini Docker**: In produzione, l'applicazione viene eseguita tramite immagini Docker pre-costruite. Dopo ogni modifica al codice, è necessario **ricostruire l'immagine** e **ricreare il container**.
- **Percorso di lavoro**: Tutti i comandi devono essere eseguiti dalla directory principale del progetto (dove si trovano i file `docker-compose.prod.yml` e `docker-compose.dev.yml`).

---

## Ambiente di Produzione

### Scopo

L'ambiente di produzione è utilizzato per eseguire l'applicazione in un contesto stabile e ottimizzato per gli utenti finali.

### File Richiesti

- `docker-compose.prod.yml`

### Comando di Avvio

Per avviare tutti i servizi (Frontend, Backend, Database) in background:

```bash
docker compose -f docker-compose.prod.yml up -d
```

- L'app sarà accessibile su: `http://localhost:8080` (o la porta configurata).

### Aggiornamento dell'Ambiente

Consulta la sezione "Aggiornamento dell'Applicazione" per i dettagli su come aggiornare i servizi in produzione.

---

## Ambiente di Sviluppo

### Scopo

L'ambiente di sviluppo è utilizzato per programmare e vedere le modifiche live durante lo sviluppo dell'applicazione.

### File Richiesti

- `docker-compose.dev.yml`
- `.env.dev`

### Comando di Avvio

Per avviare l'ambiente di sviluppo con il supporto per l'hot-reloading:

```bash
docker compose -f docker-compose.dev.yml up --build
```

- L'app sarà accessibile su: `http://localhost:5173`.

### Hot-Reloading

La caratteristica principale dell'ambiente di sviluppo è l'hot-reloading. Qualsiasi modifica ai file sorgente in `./server` o `./client` viene applicata automaticamente senza la necessità di riavviare i container Docker.

### Aggiornamento Dipendenze

Se si modifica un file `package.json` (es. aggiungendo una nuova dipendenza con `npm install`):

1. Arresta i container:
   ```bash
   docker compose -f docker-compose.dev.yml down
   ```
2. Riavvia i container con il comando di build:
   ```bash
   docker compose -f docker-compose.dev.yml up --build
   ```

---

## Risoluzione dei Problemi

Consulta la sezione "Risoluzione dei Problemi" per informazioni su come diagnosticare e risolvere eventuali problemi in entrambi gli ambienti.

---

## Note Finali

Segui attentamente le istruzioni per garantire un funzionamento ottimale dell'applicazione. Per ulteriori informazioni, consulta la documentazione ufficiale o contatta il team di supporto.