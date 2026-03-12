# Build context: repo root (docker-compose context: .)
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock turbo.json ./
COPY apps/backend apps/backend
RUN yarn install --frozen-lockfile

RUN yarn workspace backend build

# Production
FROM node:20-alpine

WORKDIR /app

# Копируем всё из builder — node_modules в workspace-структуре, backend
COPY --from=builder /app/package.json /app/yarn.lock ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend ./apps/backend

WORKDIR /app/apps/backend

# Конфиг для Docker (hostname = имя сервиса)
RUN cp config/config.docker.yml config/config.yml

EXPOSE 3000

CMD ["node", "dist/main.js"]
