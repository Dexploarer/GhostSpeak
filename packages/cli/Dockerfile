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

# Install all dependencies once
ENV CI=1
RUN bun install --ignore-scripts

# Copy source code
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

ENV NODE_ENV=production

COPY --from=builder /app/packages/cli/dist ./dist
COPY --from=builder /app/packages/cli/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

RUN addgroup --system --gid 1001 ghostspeak
RUN adduser --system --uid 1001 ghostspeak
USER ghostspeak

ENTRYPOINT ["bun", "run", "dist/index.js"]
