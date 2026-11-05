# ==========================================
# Stage 1: Build Frontend Assets
# ==========================================
FROM node:24-slim AS client-builder
WORKDIR /build/client

# Copy and install client dependencies
COPY client/package*.json ./
RUN npm ci || npm install

# Build client production bundle
COPY client/ ./
RUN npm run build

# ==========================================
# Stage 2: Production Application Runtime
# ==========================================
FROM node:24-slim AS runner
WORKDIR /app

# Install native dependencies required for better-sqlite3 build fallback
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy root dependency definitions and install production packages
COPY package*.json ./
RUN npm install --omit=dev

# Copy backend server modules
COPY server/ ./server/

# Copy compiled frontend from Stage 1 into client/dist (served statically by Express)
COPY --from=client-builder /build/client/dist ./client/dist

# Ensure persistent data directory exists
RUN mkdir -p /app/data

# Environment configuration
ENV NODE_ENV=production
ENV PORT=3000

VOLUME ["/app/data"]
EXPOSE 3000

CMD ["node", "server/index.js"]
