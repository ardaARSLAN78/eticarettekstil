FROM node:24-bookworm-slim AS base

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS build

WORKDIR /app

# Önce kilit dosyası kopyalanır; kaynak değişiklikleri bağımlılık önbelleğini bozmaz.
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts --no-audit --no-fund --prefer-offline --fetch-retries=2 --fetch-timeout=60000

COPY backend backend

ENV DATABASE_URL=postgresql://build:build@localhost:5432/build

RUN npm run db:generate -w backend
RUN npm run build -w backend

FROM base AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --workspace=@quantia/backend --ignore-scripts --no-audit --no-fund --prefer-offline --fetch-retries=2 --fetch-timeout=60000

# Migration motoru imaj oluşturulurken indirilir; çalışma anında yazma/indirme gerekmez.
RUN node node_modules/@prisma/engines/scripts/postinstall.js

COPY --from=build --chown=node:node /app/backend/dist backend/dist
COPY --chown=node:node backend/prisma backend/prisma
COPY --chown=node:node backend/prisma.config.ts backend/prisma.config.ts
COPY --chown=node:node backend/scripts/create-admin.mjs backend/scripts/create-admin.mjs
COPY --chown=node:node backend/scripts/bootstrap.mjs backend/scripts/bootstrap.mjs

RUN mkdir -p /app/backend/uploads && chown node:node /app/backend/uploads

USER node

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:4000/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy --config backend/prisma.config.ts && node backend/dist/server.js"]
