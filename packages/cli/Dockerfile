FROM oven/bun:1 AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy workspace config
COPY package.json bun.lock ./
COPY packages/cli/package.json ./packages/cli/
COPY packages/sdk-typescript/package.json ./packages/sdk-typescript/

# Install dependencies
RUN bun install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build SDK first
WORKDIR /app/packages/sdk-typescript
RUN bun run build

# Build CLI
WORKDIR /app/packages/cli
RUN bun run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

COPY --from=builder /app/packages/cli/dist ./dist
COPY --from=builder /app/packages/cli/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Create a non-root user
RUN addgroup --system --gid 1001 ghostspeak
RUN adduser --system --uid 1001 ghostspeak
USER ghostspeak

ENTRYPOINT ["bun", "run", "dist/index.js"]
