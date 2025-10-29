FROM node:18-alpine
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
