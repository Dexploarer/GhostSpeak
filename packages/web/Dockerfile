FROM oven/bun:1.3.1 AS base

# Install system dependencies upfront
RUN apt-get update && apt-get install -y \
    python3 \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Rust and wasm-pack
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"
RUN curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# Build stage
FROM base AS builder
WORKDIR /app

# Copy workspace files
COPY package.json bun.lock* ./
COPY packages/web/package.json ./packages/web/
COPY packages/sdk-typescript/package.json ./packages/sdk-typescript/
COPY packages/cli/package.json ./packages/cli/
COPY packages/docs/package.json ./packages/docs/

# Install all dependencies (skip scripts initially for speed)
ENV CI=1
RUN bun install --ignore-scripts

# Copy source code
COPY . .

# Remove Husky prepare script to prevent hang
RUN sed -i '/"prepare":/d' packages/web/package.json || true

# Build SDK first
WORKDIR /app/packages/sdk-typescript
RUN bun run build

# Build Web app
WORKDIR /app/packages/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/packages/web/public ./public

RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy built artifacts
COPY --from=builder --chown=nextjs:nodejs /app/packages/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/packages/web/.next/static ./packages/web/.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["bun", "packages/web/server.js"]
