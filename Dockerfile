# Stage 1: Install dependencies
FROM oven/bun:1.3.1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Stage 2: Build the application
FROM oven/bun:1.3.1 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1

# Contract addresses are identical on testnet and mainnet
ENV NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS=0xDf1ebEe392e6B6AFEE89Fb83CDBF97dA9f8b7B6a
ENV NEXT_PUBLIC_EVALUATION_REGISTRY_ADDRESS=0xa86D6684De7878C36F03697657702A86D13028d8
ENV NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS=0x0DB2eef99d1Efb3313c6Fe314D137914eCc6FB1f
ENV NEXT_PUBLIC_VALIDATION_REGISTRY_ADDRESS=0x5A0Bf56694c8448F681c909C1F61849c1A183f17
ENV NEXT_PUBLIC_MILESTONE_MANAGER_ADDRESS=0xb4161cB90f2664A0d4485265ee150A7f3a7d536b
ENV NEXT_PUBLIC_DISPUTE_REGISTRY_ADDRESS=0x78f8688c1a3e4ec762E7351996B7b3c275f32b0e

# Overridable at build time via --build-arg
ARG NEXT_PUBLIC_CHAIN_ID=84532
ARG NEXT_PUBLIC_APP_URL=https://agent-reviewer-ralph-1010906320334.us-central1.run.app
ENV NEXT_PUBLIC_CHAIN_ID=$NEXT_PUBLIC_CHAIN_ID
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

RUN bun run build

# Stage 3: Production runtime
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 8080

CMD ["node", "server.js"]
