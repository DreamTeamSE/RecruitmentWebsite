# Build stage
FROM node:18-alpine AS builder

# Install security updates and build tools
RUN apk update && apk upgrade && apk add --no-cache dumb-init

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install all dependencies (needed for build)
RUN npm ci --only=production=false && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage - use distroless for minimal attack surface
FROM gcr.io/distroless/nodejs18-debian11:nonroot AS production

# Copy dumb-init from builder
COPY --from=builder /usr/bin/dumb-init /usr/bin/dumb-init

WORKDIR /app

# Copy built application and production dependencies
COPY --from=builder --chown=nonroot:nonroot /app/dist ./dist
COPY --from=builder --chown=nonroot:nonroot /app/node_modules ./node_modules
COPY --from=builder --chown=nonroot:nonroot /app/package*.json ./

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD ["/nodejs/bin/node", "-e", "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"]

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["/nodejs/bin/node", "dist/index.js"]
