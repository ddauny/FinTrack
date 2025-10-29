# Multi-stage build per FinTrack
FROM node:18-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:18-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

FROM node:18-alpine AS production
WORKDIR /app
COPY --from=client-builder /app/client/dist ./client
COPY --from=server-builder /app/server/dist ./server
COPY --from=server-builder /app/server/package*.json ./server/
COPY --from=server-builder /app/server/prisma ./server/prisma
WORKDIR /app/server
RUN npm ci --production
EXPOSE 4000
CMD ["npm", "start"]
