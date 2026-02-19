# ============================================================================
# Stage 1: Build
# ============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies needed by native modules (pg, bcryptjs, etc.)
RUN apk add --no-cache python3 make g++

# Copy package manifests first for better layer caching
COPY package.json package-lock.json ./

# Install ALL dependencies (including devDependencies for tsc)
RUN npm ci

# Copy TypeScript config and source code
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript -> JavaScript into dist/
RUN npm run build

# Also compile migrations to JS for production use
COPY migrations/ ./migrations/
RUN npx tsc --outDir dist-migrations --rootDir . --resolveJsonModule --esModuleInterop --module commonjs --target es2020 --skipLibCheck --declaration false migrations/*.ts || true
# Fallback: also compile knexfile
COPY knexfile.ts ./
RUN npx tsc --outDir dist-knexfile --rootDir . --resolveJsonModule --esModuleInterop --module commonjs --target es2020 --skipLibCheck --declaration false knexfile.ts || true

# Prune devDependencies so only production deps remain for the next stage
RUN npm prune --production

# ============================================================================
# Stage 2: Production
# ============================================================================
FROM node:20-alpine AS production

# Security: run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Install only runtime OS-level dependencies
RUN apk add --no-cache dumb-init

# Copy production node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy compiled JavaScript output
COPY --from=builder /app/dist ./dist

# Copy package.json (needed for version info / runtime metadata)
COPY --from=builder /app/package.json ./

# Copy compiled migrations (JS) for production migration runs
COPY --from=builder /app/dist-migrations/migrations/ ./migrations-js/
COPY --from=builder /app/dist-knexfile/knexfile.js ./knexfile.js

# Also keep TS migrations for compatibility
COPY migrations/ ./migrations/
COPY knexfile.ts ./

# Create logs directory with correct ownership
RUN mkdir -p /app/logs && chown -R appuser:appgroup /app/logs

# Set ownership of the app directory
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose the application port
EXPOSE 3000

# Use dumb-init as PID 1 to properly handle signals
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/index.js"]
