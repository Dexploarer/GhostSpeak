FROM oven/bun:1 AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy workspace config
COPY package.json bun.lock ./
COPY packages/docs/package.json ./packages/docs/

# Install dependencies
RUN bun install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Docs
WORKDIR /app/packages/docs
RUN bun run build

# Production image, copy all the files and run astro
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

COPY --from=builder /app/packages/docs/dist ./dist
COPY --from=builder /app/packages/docs/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Create a non-root user
RUN addgroup --system --gid 1001 docs
RUN adduser --system --uid 1001 docs
USER docs

EXPOSE 4321
ENV PORT 4321
ENV HOST 0.0.0.0

CMD ["bun", "./node_modules/.bin/astro", "preview", "--host", "0.0.0.0", "--port", "4321"]
