# Build context: repo root (docker-compose context: .)
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock turbo.json ./
COPY apps/frontend apps/frontend
RUN yarn install --frozen-lockfile

WORKDIR /app/apps/frontend
RUN yarn build

FROM nginx:alpine

COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
