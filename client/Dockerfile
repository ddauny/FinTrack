FROM node:20-alpine
WORKDIR /app/client

# Copia solo i file di dipendenze
COPY package*.json ./

# Installa le dipendenze
RUN npm install

EXPOSE 5173
# Il comando per avviare il server di sviluppo
CMD ["npm", "run", "dev-exposed"]    