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

# Copy migrations and knexfile for running DB migrations at deploy time.
# Migrations are TypeScript so we also need ts-node + typescript as runtime
# dependencies -- but we compiled the knexfile into dist/ during build. If your
# migration strategy runs migrations outside the container (CI/CD step), you can
# remove these two COPY lines.
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
