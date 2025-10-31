FROM node:18-slim
WORKDIR /app/server

# Installa openssl
RUN apt-get update -y && apt-get install -y openssl

# Copia solo i file di dipendenze e prisma
COPY server/package*.json ./
COPY server/prisma ./prisma/

# Installa le dipendenze
RUN npm install

# Genera il client prisma (necessario)
RUN npx prisma generate

EXPOSE 4000
# Il comando per avviare il server di sviluppo
CMD ["npm", "run", "dev"]
