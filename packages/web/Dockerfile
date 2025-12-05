FROM oven/bun:1.3.1 AS deps
WORKDIR /app

# Copy only lockfile and package.json for better caching
COPY bun.lock package.json ./
COPY packages/web/package.json ./packages/web/
COPY packages/sdk-typescript/package.json ./packages/sdk-typescript/

# Install dependencies (let Bun handle lockfile)
RUN bun install

# Build stage
FROM oven/bun:1.3.1 AS builder
WORKDIR /app

# Install build tools
RUN apt-get update && apt-get install -y curl build-essential python3 && rm -rf /var/lib/apt/lists/*
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"
RUN curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source
COPY . .

# Build SDK
WORKDIR /app/packages/sdk-typescript
RUN bun run build

# Build Web
WORKDIR /app/packages/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# Production
FROM oven/bun:1.3.1 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/packages/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/packages/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/packages/web/.next/static ./packages/web/.next/static

RUN mkdir .next && chown nextjs:nodejs .next

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME="0.0.0.0"

CMD ["bun", "packages/web/server.js"]
