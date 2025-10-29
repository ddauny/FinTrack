FROM node:18-slim
WORKDIR /app/server

RUN apt-get update -y && apt-get install -y openssl

COPY server/package*.json ./
COPY server/prisma ./prisma/

RUN npm ci

COPY server/ ./

RUN npx prisma generate

EXPOSE 4000

CMD ["npm", "run", "dev"]
