# Deployment Plan: Agent Reviewer Worktrees on GCP Cloud Run

Deploy 3 independent Next.js App Router implementations to GCP Cloud Run with custom subdomains.

## 1. Architecture Overview

```
                     ipe.city DNS (Cloudflare / Registrar)
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
   gsd.grants.ipe.city  speckit.grants.ipe.city  superpower.grants.ipe.city
          │                   │                   │
          ▼                   ▼                   ▼
   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
   │  Cloud Run   │  │  Cloud Run   │  │  Cloud Run   │
   │  grants-gsd  │  │grants-speckit│  │grants-super  │
   │              │  │              │  │              │
   │  Next.js SSR │  │  Next.js SSR │  │  Next.js SSR │
   │  + API routes│  │  + API routes│  │  + API routes│
   │  Port 8080   │  │  Port 8080   │  │  Port 8080   │
   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
          │                   │                   │
          └───────────┬───────┴───────────────────┘
                      │
          ┌───────────┴───────────┐
          │   Shared Services     │
          │                       │
          │  - Anthropic / OpenAI │
          │  - Pinata IPFS        │
          │  - Base Sepolia RPC   │
          │  - Upstash Redis      │
          │  - Turso (speckit,    │
          │    superpower only)   │
          │  - GCP Secret Manager │
          └───────────────────────┘
```

### URL Scheme

| Service | Cloud Run Name | Custom Domain | Branch |
|---------|---------------|---------------|--------|
| GSD | `grants-gsd` | `gsd.grants.ipe.city` | full-vision-roadmap |
| Spec Kit | `grants-speckit` | `speckit.grants.ipe.city` | speckit |
| Superpowers | `grants-superpower` | `superpower.grants.ipe.city` | superpower |

### Key Difference from Existing Projects

Both `playground` and `learn-to-fly-prod` deploy Expo SPAs via `nginx:alpine` (static file serving). These worktrees are **Next.js App Router with SSR and API routes** — they must run the Next.js server process, not nginx. The Dockerfile uses `next start` as the runtime command.

---

## 2. GCP Project Setup

### Recommendation: New GCP project `ipe-city`

Rationale:
- `ai-outbound-491623` (playground) and `shippit-team` (learn-to-fly) are for different products
- Separate billing, IAM, and resource isolation
- Clean Artifact Registry namespace

### Setup Commands

```bash
# Create project (if not exists)
gcloud projects create ipe-city --name="IPE City"
gcloud config set project ipe-city

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com

# Link a billing account
gcloud billing accounts list
gcloud billing projects link ipe-city --billing-account=BILLING_ACCOUNT_ID
```

### Artifact Registry

```bash
gcloud artifacts repositories create agent-reviewer \
  --repository-format=docker \
  --location=us-central1 \
  --description="Agent Reviewer worktree images"
```

Image paths:
```
us-central1-docker.pkg.dev/ipe-city/agent-reviewer/grants-gsd
us-central1-docker.pkg.dev/ipe-city/agent-reviewer/grants-speckit
us-central1-docker.pkg.dev/ipe-city/agent-reviewer/grants-superpower
```

### Service Account for GitHub Actions

```bash
# Create service account
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions CI/CD"

SA_EMAIL="github-actions@ipe-city.iam.gserviceaccount.com"

# Grant required roles
gcloud projects add-iam-policy-binding ipe-city \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding ipe-city \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding ipe-city \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding ipe-city \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser"

# Create JSON key for GitHub Actions
gcloud iam service-accounts keys create /tmp/ipe-city-sa-key.json \
  --iam-account="${SA_EMAIL}"

# Add as GitHub secret (then delete local copy)
gh secret set GCP_SA_KEY < /tmp/ipe-city-sa-key.json
rm /tmp/ipe-city-sa-key.json
```

### Secret Manager Setup

```bash
# Create secrets for shared env vars
gcloud secrets create ANTHROPIC_API_KEY --replication-policy="automatic"
echo -n "sk-ant-..." | gcloud secrets versions add ANTHROPIC_API_KEY --data-file=-

gcloud secrets create OPENAI_API_KEY --replication-policy="automatic"
echo -n "sk-..." | gcloud secrets versions add OPENAI_API_KEY --data-file=-

gcloud secrets create PINATA_JWT --replication-policy="automatic"
echo -n "eyJ..." | gcloud secrets versions add PINATA_JWT --data-file=-

gcloud secrets create UPSTASH_REDIS_REST_URL --replication-policy="automatic"
echo -n "https://...upstash.io" | gcloud secrets versions add UPSTASH_REDIS_REST_URL --data-file=-

gcloud secrets create UPSTASH_REDIS_REST_TOKEN --replication-policy="automatic"
echo -n "..." | gcloud secrets versions add UPSTASH_REDIS_REST_TOKEN --data-file=-

# Per-service secrets
gcloud secrets create TURSO_DATABASE_URL_SPECKIT --replication-policy="automatic"
gcloud secrets create TURSO_AUTH_TOKEN_SPECKIT --replication-policy="automatic"
gcloud secrets create TURSO_DATABASE_URL_SUPERPOWER --replication-policy="automatic"
gcloud secrets create TURSO_AUTH_TOKEN_SUPERPOWER --replication-policy="automatic"
gcloud secrets create AUTH_SECRET_SPECKIT --replication-policy="automatic"

# Deployer private key (for on-chain tx from API routes)
gcloud secrets create DEPLOYER_PRIVATE_KEY --replication-policy="automatic"
```

---

## 3. Dockerfile for Next.js SSR

Two Dockerfile variants — one for Bun-based (GSD) and one for npm/Bun hybrid (speckit, superpower). Since all 3 worktrees have `bun.lock`, we use a unified Bun-based Dockerfile with Next.js standalone output.

### Dockerfile.cloudrun (shared, placed in each worktree)

```dockerfile
# ============================================================================
# Stage 1: Install dependencies
# ============================================================================
FROM oven/bun:1 AS deps

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production=false

# ============================================================================
# Stage 2: Build Next.js
# ============================================================================
FROM oven/bun:1 AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env vars (NEXT_PUBLIC_* are inlined at build time)
ARG NEXT_PUBLIC_CHAIN_ID=84532
ARG NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS
ARG NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS
ARG NEXT_PUBLIC_APP_URL

ENV NEXT_PUBLIC_CHAIN_ID=${NEXT_PUBLIC_CHAIN_ID}
ENV NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS=${NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS}
ENV NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS=${NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}

# Enable standalone output for smaller production image
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# ============================================================================
# Stage 3: Production runtime
# ============================================================================
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/api/health || exit 1

CMD ["node", "server.js"]
```

### Required next.config.ts Change

Each worktree's `next.config.ts` needs `output: "standalone"` for the Docker build to produce a self-contained server:

```typescript
const nextConfig: NextConfig = {
  output: "standalone",
  // ... existing config
};
```

### Health Check Endpoint

Add to each worktree at `src/app/api/health/route.ts` (speckit already has one):

```typescript
export function GET() {
  return Response.json({ status: "ok", timestamp: new Date().toISOString() });
}
```

### .dockerignore (shared)

```
node_modules
.next
.git
.planning
.claude
.worktrees
contracts
docs
*.md
.env*
```

---

## 4. GitHub Actions CI/CD

### Strategy

Since worktrees live in the same repo on different branches, the CI/CD uses a **matrix strategy** to deploy all 3, or individual dispatch to deploy one.

### `.github/workflows/deploy-grants.yml`

```yaml
name: Deploy Grants

on:
  # Manual deploy — select which service(s) to deploy
  workflow_dispatch:
    inputs:
      service:
        description: "Which service to deploy"
        required: true
        type: choice
        options:
          - all
          - gsd
          - speckit
          - superpower

env:
  GCP_PROJECT_ID: ipe-city
  REGION: us-central1
  GAR_REPO: us-central1-docker.pkg.dev/ipe-city/agent-reviewer

jobs:
  deploy:
    name: Deploy ${{ matrix.service.name }}
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write

    strategy:
      fail-fast: false
      matrix:
        service:
          - name: grants-gsd
            branch: gsd-execution  # adjust to actual branch name
            worktree: full-vision-roadmap
            build_args: ""
            env_vars: ""
            memory: 512Mi
          - name: grants-speckit
            branch: speckit-execution  # adjust to actual branch name
            worktree: speckit
            build_args: ""
            env_vars: "TURSO_DATABASE_URL=sm://TURSO_DATABASE_URL_SPECKIT,TURSO_AUTH_TOKEN=sm://TURSO_AUTH_TOKEN_SPECKIT,AUTH_SECRET=sm://AUTH_SECRET_SPECKIT"
            memory: 512Mi
          - name: grants-superpower
            branch: superpower-execution  # adjust to actual branch name
            worktree: superpower
            build_args: ""
            env_vars: "TURSO_DATABASE_URL=sm://TURSO_DATABASE_URL_SUPERPOWER,TURSO_AUTH_TOKEN=sm://TURSO_AUTH_TOKEN_SUPERPOWER"
            memory: 1Gi  # Mastra agents need more memory
        exclude:
          - service:
              name: ${{ github.event.inputs.service != 'all' && github.event.inputs.service != 'gsd' && 'grants-gsd' || 'NEVER_EXCLUDE' }}
          - service:
              name: ${{ github.event.inputs.service != 'all' && github.event.inputs.service != 'speckit' && 'grants-speckit' || 'NEVER_EXCLUDE' }}
          - service:
              name: ${{ github.event.inputs.service != 'all' && github.event.inputs.service != 'superpower' && 'grants-superpower' || 'NEVER_EXCLUDE' }}

    steps:
      - name: Checkout branch
        uses: actions/checkout@v4
        with:
          ref: ${{ matrix.service.branch }}

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Setup Google Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Configure Docker for Artifact Registry
        run: gcloud auth configure-docker us-central1-docker.pkg.dev --quiet

      - name: Build Docker image
        run: |
          docker build \
            --build-arg NEXT_PUBLIC_CHAIN_ID=84532 \
            --build-arg NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS=${{ secrets.IDENTITY_REGISTRY_ADDRESS }} \
            --build-arg NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS=${{ secrets.REPUTATION_REGISTRY_ADDRESS }} \
            --build-arg NEXT_PUBLIC_APP_URL=https://${{ matrix.service.name == 'grants-gsd' && 'gsd' || matrix.service.name == 'grants-speckit' && 'speckit' || 'superpower' }}.grants.ipe.city \
            -f Dockerfile.cloudrun \
            -t ${{ env.GAR_REPO }}/${{ matrix.service.name }}:${{ github.sha }} \
            -t ${{ env.GAR_REPO }}/${{ matrix.service.name }}:latest \
            .

      - name: Push Docker image
        run: |
          docker push ${{ env.GAR_REPO }}/${{ matrix.service.name }}:${{ github.sha }}
          docker push ${{ env.GAR_REPO }}/${{ matrix.service.name }}:latest

      - name: Deploy to Cloud Run
        uses: google-github-actions/deploy-cloudrun@v2
        with:
          service: ${{ matrix.service.name }}
          image: ${{ env.GAR_REPO }}/${{ matrix.service.name }}:${{ github.sha }}
          region: ${{ env.REGION }}
          flags: >-
            --no-invoker-iam-check
            --port=8080
            --memory=${{ matrix.service.memory }}
            --cpu=1
            --min-instances=0
            --max-instances=5
            --timeout=300
            --set-secrets=ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest,PINATA_JWT=PINATA_JWT:latest,UPSTASH_REDIS_REST_URL=UPSTASH_REDIS_REST_URL:latest,UPSTASH_REDIS_REST_TOKEN=UPSTASH_REDIS_REST_TOKEN:latest,DEPLOYER_PRIVATE_KEY=DEPLOYER_PRIVATE_KEY:latest

      - name: Set per-service secrets
        if: matrix.service.env_vars != ''
        run: |
          # Parse and apply service-specific secret mappings
          IFS=',' read -ra MAPPINGS <<< "${{ matrix.service.env_vars }}"
          SECRET_FLAGS=""
          for mapping in "${MAPPINGS[@]}"; do
            ENV_NAME=$(echo "$mapping" | cut -d= -f1)
            SECRET_REF=$(echo "$mapping" | cut -d= -f2 | sed 's|sm://||')
            SECRET_FLAGS="${SECRET_FLAGS}${ENV_NAME}=${SECRET_REF}:latest,"
          done
          SECRET_FLAGS="${SECRET_FLAGS%,}"

          gcloud run services update ${{ matrix.service.name }} \
            --region=${{ env.REGION }} \
            --update-secrets="${SECRET_FLAGS}"

      - name: Show deployed URL
        run: |
          URL=$(gcloud run services describe ${{ matrix.service.name }} \
            --region ${{ env.REGION }} \
            --format 'value(status.url)')
          echo "::notice title=${{ matrix.service.name }}::${URL}"
          echo "## Deployed ${{ matrix.service.name }}" >> $GITHUB_STEP_SUMMARY
          echo "**URL:** ${URL}" >> $GITHUB_STEP_SUMMARY

      - name: Cleanup old images
        run: |
          IMAGE_PATH="${{ env.GAR_REPO }}/${{ matrix.service.name }}"
          OLD_DIGESTS=$(gcloud artifacts docker images list "$IMAGE_PATH" \
            --format='get(version)' \
            --sort-by='~createTime' \
            | tail -n +2)
          if [ -n "$OLD_DIGESTS" ]; then
            for DIGEST in $OLD_DIGESTS; do
              gcloud artifacts docker images delete \
                "$IMAGE_PATH@${DIGEST}" \
                --quiet --delete-tags 2>/dev/null || true
            done
          fi
```

### Simpler Alternative: Per-Branch Deploy

If you prefer branch-based triggers instead of matrix dispatch, create 3 separate small workflows — one per branch. Each triggers on push to its branch:

```yaml
# .github/workflows/deploy-gsd.yml
on:
  push:
    branches: [gsd-execution]
# ... same steps but hardcoded for grants-gsd
```

---

## 5. Environment Variables Strategy

### Build-Time vs Runtime

| Variable | When | Reason |
|----------|------|--------|
| `NEXT_PUBLIC_*` | **Build-time** (Docker `--build-arg`) | Inlined into client JS bundles by Next.js |
| `ANTHROPIC_API_KEY` | **Runtime** (Secret Manager) | Server-only, must not leak |
| `OPENAI_API_KEY` | **Runtime** (Secret Manager) | Server-only |
| `PINATA_JWT` | **Runtime** (Secret Manager) | Server-only |
| `TURSO_DATABASE_URL` | **Runtime** (Secret Manager) | Server-only |
| `TURSO_AUTH_TOKEN` | **Runtime** (Secret Manager) | Server-only |
| `AUTH_SECRET` | **Runtime** (Secret Manager) | Server-only |
| `DEPLOYER_PRIVATE_KEY` | **Runtime** (Secret Manager) | Server-only, highly sensitive |
| `UPSTASH_REDIS_REST_*` | **Runtime** (Secret Manager) | Server-only |
| `RPC_URL` / `BASE_SEPOLIA_RPC_URL` | **Runtime** (env var) | Server-only, not secret (public RPC) |
| `DEPLOYMENT_BLOCK` | **Runtime** (env var) | Server-only config |

### Per-Service Environment Matrix

| Variable | GSD | Spec Kit | Superpowers |
|----------|-----|----------|-------------|
| ANTHROPIC_API_KEY | Yes | Yes | Yes |
| OPENAI_API_KEY | Yes | - | - |
| PINATA_JWT | Yes | Yes | Yes |
| UPSTASH_REDIS_REST_URL | Yes | Yes | Yes |
| UPSTASH_REDIS_REST_TOKEN | Yes | Yes | Yes |
| DEPLOYER_PRIVATE_KEY | Yes | Yes | Yes |
| TURSO_DATABASE_URL | - | Yes | Yes |
| TURSO_AUTH_TOKEN | - | Yes | Yes |
| AUTH_SECRET | - | Yes | - |
| WEBHOOK_API_KEY_HASH | - | Yes | - |
| CRON_SECRET | - | Yes | - |
| NEXT_PUBLIC_GRAPH_URL | - | Yes | - |
| BASE_SEPOLIA_RPC_URL | Yes | Yes | Yes |
| PINATA_GATEWAY_URL | Yes | - | Yes |

### Injection Pattern

Cloud Run supports `--set-secrets` to mount Secret Manager values as env vars at runtime — no code changes needed. The `--set-secrets` flag format:

```
--set-secrets=ENV_NAME=SECRET_NAME:VERSION
```

Non-secret runtime env vars use `--set-env-vars`:

```
--set-env-vars=BASE_SEPOLIA_RPC_URL=https://sepolia.base.org,DEPLOYMENT_BLOCK=0
```

---

## 6. Domain and SSL

### Option A: Cloud Run Domain Mapping (Simpler)

```bash
# Map custom domains to Cloud Run services
gcloud run domain-mappings create \
  --service=grants-gsd \
  --domain=gsd.grants.ipe.city \
  --region=us-central1

gcloud run domain-mappings create \
  --service=grants-speckit \
  --domain=speckit.grants.ipe.city \
  --region=us-central1

gcloud run domain-mappings create \
  --service=grants-superpower \
  --domain=superpower.grants.ipe.city \
  --region=us-central1
```

After mapping, GCP provides CNAME records to add to DNS:

```
gsd.grants.ipe.city       CNAME  ghs.googlehosted.com.
speckit.grants.ipe.city    CNAME  ghs.googlehosted.com.
superpower.grants.ipe.city CNAME  ghs.googlehosted.com.
```

SSL certificates are automatically provisioned and renewed by Google (managed SSL). Propagation takes ~15 minutes.

### Option B: Global HTTPS Load Balancer (More Control)

Only needed if you want:
- WAF / Cloud Armor rules
- CDN caching for static assets
- More advanced routing (path-based, header-based)

For this project's scope, **Option A is sufficient**.

### DNS Configuration

At your DNS provider (likely where `ipe.city` is registered):

1. Add the 3 CNAME records shown above
2. Wait for DNS propagation (usually <5 min with low TTL)
3. SSL cert will auto-provision once DNS resolves to Google

---

## 7. Per-Worktree Considerations

### GSD (`full-vision-roadmap`)

| Aspect | Details |
|--------|---------|
| **Next.js** | 16.2.3 |
| **Package manager** | Bun (bun.lock present) |
| **Database** | None — fully on-chain + IPFS |
| **Auth** | None |
| **AI provider** | `@ai-sdk/anthropic` + `@ai-sdk/openai` via Vercel AI SDK |
| **Extra deps** | `recharts` (charting), `viem` |
| **Contracts** | 2 (IdentityRegistry, ReputationRegistry) |
| **Memory** | 512Mi sufficient |
| **Notes** | Simplest deployment — no DB, no auth. Closest to minimal. |

### Spec Kit (`speckit`)

| Aspect | Details |
|--------|---------|
| **Next.js** | 15.3.1 |
| **Package manager** | Has `bun.lock` (use Bun despite original npm intent) |
| **Database** | Drizzle + `@libsql/client` (Turso) |
| **Auth** | NextAuth v5 beta |
| **AI provider** | `@ai-sdk/anthropic` + `@ai-sdk/openai` |
| **Extra deps** | `graphql`, `graphql-request`, `@graphprotocol/client-cli`, `pinata`, `isomorphic-dompurify` |
| **Contracts** | 6 (most complex on-chain footprint) + subgraph |
| **Memory** | 512Mi |
| **Notes** | Most complex worktree. Needs Turso DB provisioned, NextAuth `AUTH_SECRET`, webhook key, cron secret. GraphQL subgraph URL must be configured. DB migrations must run before first deploy. |

**Pre-deploy step for Spec Kit:**
```bash
# Run Drizzle migrations against Turso
cd .worktrees/speckit
TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... bunx drizzle-kit push
```

### Superpowers (`superpower`)

| Aspect | Details |
|--------|---------|
| **Next.js** | 16.2.3 |
| **Package manager** | Both `bun.lock` and `package-lock.json` present. Use Bun. |
| **Database** | Drizzle + `@libsql/client` (Turso) |
| **Auth** | None |
| **AI provider** | `@ai-sdk/anthropic` via Mastra (`@mastra/core` + `@mastra/evals`) |
| **Extra deps** | Mastra framework (agent orchestration), `isomorphic-dompurify` |
| **Contracts** | 3 (IdentityRegistry, ReputationRegistry, MilestoneManager) |
| **Memory** | **1Gi recommended** — Mastra agent framework with parallel judge execution needs more memory |
| **Notes** | SSE streaming for real-time eval progress. Mastra runs in-process (not separate service like learn-to-fly-prod). Needs Turso DB. May need `--timeout=300` for long-running evaluations. |

**Pre-deploy step for Superpowers:**
```bash
cd .worktrees/superpower
TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... bunx drizzle-kit push
```

---

## 8. Database Considerations

### Recommendation: Turso (Managed libSQL)

**Why Turso over alternatives:**

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **Turso** | Zero-config, free tier (500 DBs, 9GB), `@libsql/client` already in deps, edge-replicated | Managed service dependency | **Recommended** |
| Cloud SQL (SQLite via proxy) | GCP-native | Overkill, requires VPC connector, always-on cost | No |
| Embedded SQLite in container | Zero dependency | Data lost on container restart (Cloud Run is stateless) | No — unacceptable for production |

### Turso Setup

```bash
# Install Turso CLI
brew install tursodatabase/tap/turso
turso auth login

# Create databases — one per worktree that needs it
turso db create agent-reviewer-speckit --group default
turso db create agent-reviewer-superpower --group default

# Get connection URLs
turso db show agent-reviewer-speckit --url
turso db show agent-reviewer-superpower --url

# Create auth tokens
turso db tokens create agent-reviewer-speckit
turso db tokens create agent-reviewer-superpower
```

Store the URLs and tokens in GCP Secret Manager (see Section 2).

### Migration Strategy

Drizzle migrations must run before or during the first deploy. Options:

1. **Manual push before deploy** (simplest for dev/staging):
   ```bash
   TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... bunx drizzle-kit push
   ```

2. **CI step before Cloud Run deploy** (add to workflow):
   ```yaml
   - name: Run DB migrations
     if: matrix.service.name != 'grants-gsd'
     run: bunx drizzle-kit push
     env:
       TURSO_DATABASE_URL: ${{ secrets[format('TURSO_DATABASE_URL_{0}', matrix.service.worktree)] }}
       TURSO_AUTH_TOKEN: ${{ secrets[format('TURSO_AUTH_TOKEN_{0}', matrix.service.worktree)] }}
   ```

---

## 9. Cost Estimate

### GCP Cloud Run Pricing (us-central1)

| Resource | Free Tier | After Free Tier |
|----------|-----------|-----------------|
| Requests | 2M/month | $0.40/million |
| CPU | 180,000 vCPU-seconds/month | $0.00002400/vCPU-second |
| Memory | 360,000 GiB-seconds/month | $0.00000250/GiB-second |
| Networking | 1GB egress/month | $0.12/GB |

### Estimated Monthly Cost

| Scenario | Traffic | Est. Cost |
|----------|---------|-----------|
| **Development** (min-instances=0) | <100 req/day | **$0** (free tier) |
| **Low traffic** | ~1K req/day | **$5-10/month** total (3 services) |
| **Medium traffic** | ~10K req/day | **$30-55/month** total |

### External Service Costs

| Service | Free Tier | Notes |
|---------|-----------|-------|
| Turso | 500 DBs, 9GB storage, 1B rows read | More than enough |
| Pinata | 100 files, 1GB | May need paid plan ($20/mo) for production IPFS |
| Upstash Redis | 10K commands/day | Enough for rate limiting |
| Anthropic API | Pay-per-use | ~$3/1M input tokens (Sonnet) |
| Base Sepolia | Free testnet | $0 |
| Artifact Registry | 0.5GB free | $0.10/GB after |

### Cost Optimization

1. **`min-instances=0`** — services scale to zero when idle (critical for dev)
2. **Standalone output** — smaller images = faster cold starts = less billable time
3. **Image cleanup** — workflow deletes old images, saves Artifact Registry storage
4. **Shared secrets** — one Secret Manager secret accessed by all 3 services, not duplicated
5. **Single region** — all services in `us-central1`, no cross-region egress

---

## 10. Step-by-Step Deployment Checklist

### Phase 0: Prerequisites

- [ ] 1. Verify `gcloud` CLI is authenticated: `gcloud auth list`
- [ ] 2. Verify `gh` CLI is authenticated: `gh auth status`
- [ ] 3. Verify `turso` CLI is installed: `turso --version`

### Phase 1: GCP Project Setup

- [ ] 4. Create GCP project `ipe-city` (or use existing if you have one)
- [ ] 5. Enable APIs: `run`, `artifactregistry`, `secretmanager`, `cloudbuild`
- [ ] 6. Link billing account
- [ ] 7. Create Artifact Registry repository `agent-reviewer`
- [ ] 8. Create service account `github-actions` with required roles
- [ ] 9. Generate SA JSON key and add as GitHub secret `GCP_SA_KEY`

### Phase 2: External Services

- [ ] 10. Create Turso databases for speckit and superpower
- [ ] 11. Get Turso connection URLs and auth tokens
- [ ] 12. Verify Pinata JWT works: `curl -H "Authorization: Bearer $PINATA_JWT" https://api.pinata.cloud/data/testAuthentication`
- [ ] 13. Verify Upstash Redis credentials

### Phase 3: Secret Manager

- [ ] 14. Create all secrets in GCP Secret Manager (see Section 2)
- [ ] 15. Add secret values for: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `PINATA_JWT`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `DEPLOYER_PRIVATE_KEY`
- [ ] 16. Add per-service secrets: `TURSO_DATABASE_URL_SPECKIT`, `TURSO_AUTH_TOKEN_SPECKIT`, `TURSO_DATABASE_URL_SUPERPOWER`, `TURSO_AUTH_TOKEN_SUPERPOWER`, `AUTH_SECRET_SPECKIT`

### Phase 4: Prepare Worktrees

- [ ] 17. Add `output: "standalone"` to each worktree's `next.config.ts`
- [ ] 18. Add health check endpoint (`/api/health`) to GSD and superpower worktrees (speckit already has one)
- [ ] 19. Add `Dockerfile.cloudrun` to each worktree root
- [ ] 20. Add `.dockerignore` to each worktree root
- [ ] 21. Test build locally for each worktree:
  ```bash
  cd .worktrees/full-vision-roadmap
  docker build -f Dockerfile.cloudrun -t grants-gsd:test .
  docker run -p 8080:8080 grants-gsd:test
  # Visit http://localhost:8080/api/health
  ```
- [ ] 22. Run DB migrations for speckit and superpower (against Turso)

### Phase 5: First Deploy (Manual)

Deploy manually first to verify everything works before setting up CI/CD:

- [ ] 23. Authenticate Docker to Artifact Registry:
  ```bash
  gcloud auth configure-docker us-central1-docker.pkg.dev --quiet
  ```

- [ ] 24. Build, push, and deploy GSD (simplest — no DB):
  ```bash
  cd .worktrees/full-vision-roadmap
  IMAGE="us-central1-docker.pkg.dev/ipe-city/agent-reviewer/grants-gsd"
  
  docker build -f Dockerfile.cloudrun \
    --build-arg NEXT_PUBLIC_CHAIN_ID=84532 \
    -t ${IMAGE}:v1 .
  
  docker push ${IMAGE}:v1
  
  gcloud run deploy grants-gsd \
    --image=${IMAGE}:v1 \
    --region=us-central1 \
    --port=8080 \
    --memory=512Mi \
    --min-instances=0 \
    --max-instances=5 \
    --allow-unauthenticated \
    --set-secrets="ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest,PINATA_JWT=PINATA_JWT:latest,UPSTASH_REDIS_REST_URL=UPSTASH_REDIS_REST_URL:latest,UPSTASH_REDIS_REST_TOKEN=UPSTASH_REDIS_REST_TOKEN:latest,DEPLOYER_PRIVATE_KEY=DEPLOYER_PRIVATE_KEY:latest" \
    --set-env-vars="BASE_SEPOLIA_RPC_URL=https://sepolia.base.org,DEPLOYMENT_BLOCK=0"
  ```

- [ ] 25. Verify GSD deployment: visit the Cloud Run URL, check `/api/health`
- [ ] 26. Repeat for speckit (add Turso + auth secrets)
- [ ] 27. Repeat for superpower (add Turso secrets, use 1Gi memory)

### Phase 6: CI/CD

- [ ] 28. Add GitHub Actions workflow (`.github/workflows/deploy-grants.yml`)
- [ ] 29. Add build-time secrets to GitHub repo: `IDENTITY_REGISTRY_ADDRESS`, `REPUTATION_REGISTRY_ADDRESS`
- [ ] 30. Test workflow with manual dispatch: deploy one service
- [ ] 31. Test workflow: deploy all services

### Phase 7: Custom Domains

- [ ] 32. Create Cloud Run domain mappings for all 3 services
- [ ] 33. Add CNAME records to DNS for `ipe.city`
- [ ] 34. Wait for SSL certificate provisioning (~15 min)
- [ ] 35. Verify all 3 URLs resolve with HTTPS

### Phase 8: Validation

- [ ] 36. Test each service end-to-end: submit a proposal, trigger evaluation, verify IPFS pin, check on-chain tx
- [ ] 37. Verify SSE streaming works on superpower (Cloud Run supports it with `--timeout=300`)
- [ ] 38. Check Cloud Run logs for errors: `gcloud run services logs read grants-gsd --region us-central1`
- [ ] 39. Set up uptime checks (see Section 11)

---

## 11. Monitoring and Logging

### Cloud Run Built-in Logging

All stdout/stderr from the Next.js process appears in Cloud Logging automatically.

```bash
# View recent logs
gcloud run services logs read grants-gsd --region us-central1 --limit=50
gcloud run services logs read grants-speckit --region us-central1 --limit=50
gcloud run services logs read grants-superpower --region us-central1 --limit=50

# Stream logs in real-time
gcloud run services logs tail grants-gsd --region us-central1
```

### Log-Based Alerting

```bash
# Create alert policy for 5xx errors across all 3 services
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="Grants 5xx Errors" \
  --condition-display-name="5xx rate > 5/min" \
  --condition-filter='resource.type="cloud_run_revision" AND resource.labels.service_name=starts_with("grants-") AND httpRequest.status>=500' \
  --condition-threshold-value=5 \
  --condition-threshold-duration=60s
```

Or configure via Cloud Console: **Monitoring > Alerting > Create Policy**.

### Uptime Checks

```bash
# Create uptime checks for each service health endpoint
for SERVICE in grants-gsd grants-speckit grants-superpower; do
  gcloud monitoring uptime create \
    --display-name="${SERVICE} health" \
    --resource-type=cloud-run-revision \
    --cloud-run-service="${SERVICE}" \
    --cloud-run-region=us-central1 \
    --path="/api/health" \
    --period=300 \
    --timeout=10
done
```

### Cost Monitoring

```bash
# Set budget alert at $50/month
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="IPE City Monthly Budget" \
  --budget-amount=50 \
  --threshold-rule=percent=0.5 \
  --threshold-rule=percent=0.9 \
  --threshold-rule=percent=1.0
```

### Useful Cloud Console Links

After project creation, these URLs will work:
- Cloud Run services: `console.cloud.google.com/run?project=ipe-city`
- Logs: `console.cloud.google.com/logs?project=ipe-city`
- Secret Manager: `console.cloud.google.com/security/secret-manager?project=ipe-city`
- Artifact Registry: `console.cloud.google.com/artifacts?project=ipe-city`
- Monitoring: `console.cloud.google.com/monitoring?project=ipe-city`
