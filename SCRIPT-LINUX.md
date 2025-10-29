# 🐧 FinTrack - Script Linux

## 🚀 **Avvio Rapido Linux**

### **Metodo 1: Script Automatico (Raccomandato)**
```bash
# Rendi eseguibile
chmod +x start_fintrack.sh

# Esegui lo script
./start_fintrack.sh
```

### **Cosa fa lo script:**
1. ✅ **Verifica Docker** - Controlla che Docker sia in esecuzione
2. ✅ **Crea Database** - Avvia container PostgreSQL su porta 5432
3. ✅ **Configura .env** - Crea file di configurazione automaticamente
4. ✅ **Installa Dipendenze** - npm install per server e client
5. ✅ **Setup Database** - Prisma migrate e generate
6. ✅ **Avvia App** - Server e client in background

### **Accesso:**
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:4000
- **Database**: localhost:5432

### **Fermare l'App:**
```bash
# Il script mostra i PID quando avvia
# Per fermare manualmente:
kill [SERVER_PID] [CLIENT_PID]

# Oppure premi Ctrl+C nel terminale dello script
```

### **Troubleshooting:**

#### **Errore: "Docker non risulta in esecuzione"**
```bash
# Avvia Docker
sudo systemctl start docker
# O se hai Docker Desktop
sudo systemctl start docker-desktop
```

#### **Errore: "Porta 5432 già in uso"**
```bash
# Ferma container esistenti
docker stop $(docker ps -q --filter "publish=5432")
```

#### **Errore: "Permission denied"**
```bash
# Rendi eseguibile
chmod +x start_fintrack.sh
```

### **Configurazione Database:**
Lo script crea automaticamente:
- **Database**: `fintrack`
- **User**: `postgres`
- **Password**: `postgres`
- **Port**: `5432`

### **File .env Creato:**
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fintrack?schema=public
JWT_SECRET=change_me_dev_secret
PORT=4000
NODE_ENV=development
ALLOW_DEMO_SEED=true
```

### **Logs e Debug:**
```bash
# Vedi logs del container database
docker logs fintrack-db

# Vedi processi in esecuzione
ps aux | grep node

# Vedi porte in uso
netstat -tulpn | grep :4000
netstat -tulpn | grep :5173
```

## 🎯 **Risultato**

Dopo aver eseguito `./start_fintrack.sh`:
- ✅ **Database PostgreSQL** in esecuzione
- ✅ **Server FinTrack** su porta 4000
- ✅ **Client FinTrack** su porta 5173
- ✅ **App accessibile** su http://localhost:5173

**Pronto per iniziare! 🚀**
