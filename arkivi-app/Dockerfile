# syntax=docker/dockerfile:1

# ==============================================================================
# Faza 1: Dependencies & Build
# Përdorim Debian Bookworm Slim për mbështetje native të Sharp dhe SQLite (glibc)
# ==============================================================================
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Instalo paketat e nevojshme të sistemit
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Kopjo skedarët e varësive
COPY package.json package-lock.json* bun.lock* ./

# Instalo të gjitha varësitë për ndërtim
RUN npm install --legacy-peer-deps

# Kopjo kodin burimor
COPY . .

# Përpilo Next.js dhe Payload CMS për prodhim
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ==============================================================================
# Faza 2: Production Runner
# Container i lehtë, i sigurt dhe i gatshëm për prodhim
# ==============================================================================
FROM node:20-bookworm-slim AS runner

WORKDIR /app

# Instalo curl për healthcheck në prodhim
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3001
ENV NEXT_TELEMETRY_DISABLED=1

# Krijo dosjet e persistencës me të drejta të plota
RUN mkdir -p /app/data /app/public/uploads /app/backups

# Kopjo varësitë dhe skedarët e ndërtuar nga faza builder
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/src ./src
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/data ./data

# Kopjo dhe bëj të ekzekutueshëm skriptin e hyrjes
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Porta e shërbimit
EXPOSE 3001

# Kontrolli automatik i shëndetit të kontejnerit (Healthcheck)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3001/api/site || exit 1

# Vëllimet e ruajtjes së përhershme (Data persistence)
VOLUME ["/app/data", "/app/public/uploads", "/app/backups"]

# Skripti hyrës inicializon seed/superuser nëse mungon dhe pastaj nis shërbyesin
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "start"]
