# Base image only for runtime
FROM oven/bun:1-alpine AS base
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Dependencies build stage
FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Builder stage
FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# Final runtime stage (minimal)
FROM oven/bun:1-alpine AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Copy only production deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Copy only necessary build outputs
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Permissions
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000
CMD ["bun", "run", "start"]
