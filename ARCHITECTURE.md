# Hookfire: Architecture & System Design Blueprint

This document defines the complete system design, data & control flows, lifecycles, and cryptographic decisions for **Hookfire**-a production-inspired webhook delivery engine.

---

## 1. System Blueprint

Hookfire operates as a decoupled, event-driven system. It separates API ingestion (low latency, high availability) from webhook delivery execution (background workers, asynchronous, isolated).

```mermaid
graph LR
    %% ── Clients ──────────────────────────────────────────────────────────
    Client([Producer Client])
    Dashboard([React Dashboard])

    %% ── Core Infrastructure ──────────────────────────────────────────────
    API[/Express API Server/]
    PG[(PostgreSQL)]
    Redis[(Redis · BullMQ)]

    %% ── Background Workers ───────────────────────────────────────────────
    subgraph Workers [" Background Workers "]
        direction TB
        FO_Worker[Fan-Out Worker]
        WH_Worker[Webhook Delivery Worker]
    end

    %% ── External ─────────────────────────────────────────────────────────
    Receiver([Webhook Receiver])

    %% ── Edges: Ingestion ─────────────────────────────────────────────────
    Client  -->|"① POST /events"| API
    Dashboard -->|"Query metrics / DLQ / endpoints"| API
    API -->|"② Persist event"| PG
    API -->|"③ Enqueue fan-out job"| Redis

    %% ── Edges: Fan-Out Worker ────────────────────────────────────────────
    Redis -->|"④ Pull fan-out job"| FO_Worker
    FO_Worker -->|"⑤ Resolve subscriptions"| PG
    FO_Worker -->|"⑥ Create Delivery rows"| PG
    FO_Worker -->|"⑦ Enqueue delivery jobs"| Redis

    %% ── Edges: Webhook Delivery Worker ──────────────────────────────────
    Redis -->|"⑧ Pull delivery job"| WH_Worker
    WH_Worker -->|"⑨ Decrypt secret"| PG
    WH_Worker -->|"⑩ POST webhook (HMAC signed)"| Receiver
    WH_Worker -->|"⑪ Log attempt & update status"| PG

```

---

## 2. Data Model Blueprint

The database uses PostgreSQL as the source of truth, managed via **Prisma 7** with the `@prisma/adapter-pg` driver adapter.

```mermaid
erDiagram
    Event ||--o{ Delivery : "produces"
    WebhookEndpoint ||--o{ Delivery : "targets"
    WebhookEndpoint ||--o{ EndpointSubscription : "subscribes"
    Delivery ||--|{ DeliveryAttempt : "attempts"
    Delivery ||--o| ProcessedWebhook : "idempotency key"

    Event {
        string id PK
        string eventType "indexed"
        json   payload
        datetime createdAt
    }

    Delivery {
        string   id PK
        string   eventId    FK
        string   endpointId FK
        string   status     "PENDING | SUCCESS | FAILED"
        int      attemptCount
        string   latestError   "nullable"
        datetime lastAttemptAt "nullable"
        datetime createdAt
        datetime updatedAt
    }

    DeliveryAttempt {
        string   id PK
        string   deliveryId   FK "cascade delete"
        string   status        "PENDING | SUCCESS | FAILED"
        int      attemptNumber
        string   errorMessage  "nullable"
        datetime startedAt
        datetime finishedAt
    }

    WebhookEndpoint {
        string   id  PK
        string   url "unique"
        string   secretEncrypted
        string   secretIv
        string   secretTag
        string   previousSecretEncrypted "nullable - rotation grace"
        string   previousSecretIv        "nullable"
        string   previousSecretTag       "nullable"
        datetime rotatedAt  "nullable"
        boolean  isActive   "default true"
        datetime createdAt
    }

    EndpointSubscription {
        string   id PK
        string   endpointId FK "cascade delete"
        string   eventType      "unique per endpoint"
        datetime createdAt
    }

    ProcessedWebhook {
        string   id PK
        string   deliveryId UK
        datetime createdAt
    }
```

---

## 3. Directory Layout & Core Components

### A. Backend Layout (`api/src`)

```
src/
  +-- config/          # Zod env schema validation (env.ts) & Redis config (redis.ts)
  +-- controllers/     # HTTP controllers mapping request params to service calls
  +-- routes/          # Express REST routes (events, deliveries, endpoints, metrics,
                       #   dlq, demo, health, webhook-test)
  +-- services/        # Business logic: event, delivery, webhook-endpoint,
                       #   webhook (HTTP dispatch), queue, idempotency
  +-- workers/         # BullMQ worker initialization & event listeners
  +-- processors/      # Job handler functions executed by workers
  +-- queues/          # BullMQ queue instances (fanoutQueue, webhookQueue)
  +-- middlewares/     # Cross-cutting concerns: logging (Pino), error handling,
                       #   Redis sliding-window rate limiter
  +-- validators/      # Zod payload schema definitions
  +-- lib/             # Shared singletons: Prisma client, Pino logger, IORedis client
  +-- utils/           # AES-GCM crypto, HMAC signature utilities
  +-- index.ts         # API server entry point
  +-- fanout-worker.entry.ts   # Fan-out worker process entry point
  +-- webhook-worker.entry.ts  # Webhook delivery worker process entry point
```

### B. Frontend Layout (`dashboard/src`)

```
src/
  +-- api/           # Axios client instance (client.ts) targeting the API backend
  +-- components/    # Presentational views (DeliveryTable, MetricCard, Pagination)
  +-- hooks/         # Custom React hooks (useDemo.ts - demo orchestration state)
  +-- pages/         # Page containers (Dashboard.tsx - consolidated main view)
  +-- types/         # TypeScript definitions matching API response envelopes
```

### Key Components

| File                                   | Responsibility                                                         |
| :------------------------------------- | :--------------------------------------------------------------------- |
| `config/env.ts`                        | Zod-validates all env vars at startup; process exits on failure        |
| `middlewares/rate-limit.middleware.ts` | Redis sliding-window rate limiter (4 tiers)                            |
| `services/delivery.service.ts`         | Transactionally updates delivery + attempt rows in sync                |
| `services/idempotency.service.ts`      | Prevents duplicate processing via `ProcessedWebhook` unique constraint |
| `services/queue.service.ts`            | Centralized job enqueueing with retry/retention options                |
| `utils/crypto.ts`                      | AES-256-GCM encrypt/decrypt for webhook signing secrets                |
| `utils/signature.ts`                   | HMAC-SHA256 generate & timing-safe verify                              |
| `routes/webhook-test.routes.ts`        | Built-in receiver endpoint (demo & verification testing)               |
| `routes/health.routes.ts`              | `GET /health` liveness probe for Docker/orchestrators                  |

---

## 4. Data & Control Flow

### A. Webhook Ingestion & Fan-Out Lifecycle

```
 [Producer Client]

          HTTP POST /events
         v
   +-----------+
     Express   -- 1. Zod payload validation
     Router    -- 2. Persist Event row in PostgreSQL
   +-----------+

          3. Enqueue 'fanout-job' in Redis (jobId = eventId)
         v
   +-----------+
     Redis
   +-----------+
         v
          4. Poll and fetch 'fanout-job'
         v
   +-----------+
     Fan-Out   -- 5. Query active WebhookEndpoints subscribed to EventType
     Worker    -- 6. For each matched endpoint (parallel, isolated):
   +-----------+       a. getOrCreate Delivery row (status: PENDING)
                       b. Enqueue 'deliver-webhook' job (jobId = deliveryId)
                       c. On enqueue failure --> mark Delivery FAILED (fan-out isolation)
```

### B. Webhook Delivery Lifecycle

```
   +-----------+
      Redis
   +-----------+
         v
          1. Poll and fetch 'deliver-webhook' job
         v
   +-----------+
     Webhook   -- 2. Create DeliveryAttempt (status: PENDING) in PostgreSQL
     Worker    -- 3. Read endpoint URL & decrypt webhook secret (AES-GCM)
   +-----------+ -- 4. Sign payload: HMAC-SHA256(timestamp + "." + json_body)
                -- 5. POST HTTP to target endpoint URL (10s timeout)

         +-> [SUCCESS 2xx] --> 6. Update DeliveryAttempt (SUCCESS) & Delivery (SUCCESS)

         +-> [FAILURE / Timeout]

                +--> 6a. Update DeliveryAttempt (FAILED) with error message

                +--> 6b. If attemptsMade < maxAttempts (3):
                         Update Delivery: PENDING, throw error - BullMQ exponential backoff

                +--> 6c. If attemptsMade >= maxAttempts (or UnrecoverableError):
                          Update Delivery: FAILED - job moves to BullMQ failed set (DLQ)
```

---

## 5. Lifecycles & State Transitions

### A. Delivery Status Transitions

```mermaid
stateDiagram-v2
    [*] --> PENDING : Event Ingested & Delivery Row Created

    state Delivery_Worker {
        PENDING --> SUCCESS : "Receiver returns 2xx"
        PENDING --> PENDING : "Failure & attemptCount < 3 (Backoff scheduled)"
        PENDING --> FAILED : "Failure & attemptCount >= 3 (Retries exhausted)"
    }

    FAILED --> PENDING : "Operator triggers manual DLQ retry via API"
```

### B. Request Execution Pipeline

All API requests pass through this ordered middleware stack:

```
Request
  --> [Pino HTTP Logger]
  --> [CORS Origin Validator]
  --> [Rate Limiter (Redis Sliding Window)]   # route-specific tier applied
  --> [Body Parser: JSON (50kb) or Raw (256kb for /webhook-test)]
  --> [Zod Schema Validator]
  --> [Route Handler / Controller]
  --> Response
        | (on error)
        v
  [Centralized Error Middleware] --> Standard JSON Error Response
```

**Rate Limiter Tiers** (sliding window, Redis-backed, fail-open):

| Tier                     | Route Scope                   | Limit       |
| :----------------------- | :---------------------------- | :---------- |
| `ingestionLimiter`       | `POST /webhook-test`          | 600 req/min |
| `readLimiter`            | Dashboard read endpoints      | 300 req/min |
| `writeLimiter`           | Config/registration endpoints | 60 req/min  |
| `strictOperationLimiter` | Event dispatch, demo start    | 15 req/min  |

---

## 6. Cryptography & Security Specifications

### A. Secret Encryption-at-Rest (`AES-256-GCM`)

To prevent raw database leaks from exposing client webhook signing keys:

1. A random **12-byte IV** is generated per secret.
2. The secret is encrypted with the IV and the `ENCRYPTION_KEY` (exactly 32 bytes).
3. The **GCM authentication tag** is extracted post-encryption.
4. The DB stores hex-encoded `secretEncrypted`, `secretIv`, and `secretTag`.
5. Decryption is in-memory during worker execution; plaintext secrets are never persisted.

### B. Webhook Signature Construction & Headers

$$\text{Payload} = \text{timestamp} \mathbin{\Vert} \text{"."} \mathbin{\Vert} \text{rawBody}$$

$$\text{Signature} = \text{HMAC-SHA256}(\text{Payload},\ \text{SecretKey})$$

- **`X-Hookfire-Signature`**: `v1=<active_sig_hex>[,v0=<previous_sig_hex>]`
  - `v1` = current active secret; `v0` = previous secret (during 24h rotation grace period)
- **`X-Hookfire-Timestamp`**: Unix epoch seconds of dispatch
- **`X-Hookfire-Delivery-Id`**: Delivery ID for receiver-side idempotency checks

### C. Receiver-Side Verification Protocol

1. **Replay Protection**: Reject if `|now - X-Hookfire-Timestamp| > 300s` (5 min).
2. **Local Signature**: Reconstruct `HMAC-SHA256(timestamp.rawBody, sharedSecret)`.
3. **Timing-Safe Comparison**: Use `crypto.timingSafeEqual()` (constant-time) to compare.
4. **Raw Body**: Compute against the raw buffer to avoid JSON normalization drift.
5. **Idempotency**: Use `X-Hookfire-Delivery-Id` to insert into `ProcessedWebhook`; the unique constraint prevents duplicate processing.

### D. CORS Origin Whitelisting

`env.ALLOWED_ORIGINS` is parsed from a comma-separated string into a `string[]` at startup. Incoming origins are checked via strict array membership (`includes(origin)`), not substring matching, to prevent domain-hijack vectors.

---

## 7. Queue Mechanics & Retry Policies

### A. Queue Parameters

| Parameter                   | Value                               | Notes                          |
| :-------------------------- | :---------------------------------- | :----------------------------- |
| **Max Retry Attempts**      | `3`                                 | Per delivery job               |
| **Retry Backoff Type**      | `exponential`                       | BullMQ built-in                |
| **Initial Backoff Delay**   | `1,000ms` (prod) / `4,000ms` (demo) | Configurable via `isDemo` flag |
| **Delivery Concurrency**    | `10` (demo)                         | Tunable; production target: 50 |
| **Job Retention (Success)** | `1,000` entries                     | `removeOnComplete`             |
| **Job Retention (Failed)**  | `5,000` entries                     | `removeOnFail` - DLQ pool      |
| **Fan-Out Job ID**          | `eventId`                           | BullMQ deduplication           |
| **Delivery Job ID**         | `deliveryId`                        | BullMQ deduplication           |

### B. Exponential Backoff Schedule

$$\text{Delay} = \text{Initial Delay} \times 2^{\text{attemptsMade} - 1}$$

For production (`initialDelay = 1,000ms`):

| Attempt | Executed After | Outcome if Failed        |
| :------ | :------------- | :----------------------- |
| 1       | Immediately    | Retry in **1,000ms**     |
| 2       | +1s            | Retry in **2,000ms**     |
| 3       | +2s            | --> DLQ (`failed` state) |

### C. Fan-Out Resilience

The fan-out processor uses an internal `retryWithBackoff` (3 retries, 500ms base, factor 2) when enqueuing delivery jobs. Each endpoint's delivery pipeline is independently isolated - a failure for one endpoint does not block others (`Promise.allSettled`).

---

## 8. API Reference

### Endpoints

| Method  | Path                           | Description                                    |
| :------ | :----------------------------- | :--------------------------------------------- |
| `POST`  | `/events`                      | Ingest an event; triggers fan-out              |
| `GET`   | `/deliveries`                  | List deliveries with filtering                 |
| `GET`   | `/metrics`                     | Dashboard aggregate metrics                    |
| `GET`   | `/dlq`                         | List failed jobs in BullMQ DLQ                 |
| `POST`  | `/dlq/:jobId/retry`            | Manually retry a DLQ job                       |
| `GET`   | `/endpoints`                   | List webhook endpoints                         |
| `POST`  | `/endpoints`                   | Register a new webhook endpoint                |
| `PATCH` | `/endpoints/:id/rotate-secret` | Rotate endpoint signing secret                 |
| `POST`  | `/demo/start`                  | Start automated demo scenario                  |
| `GET`   | `/demo/status`                 | Query demo run state                           |
| `GET`   | `/health`                      | Liveness probe (PostgreSQL + Redis)            |
| `POST`  | `/webhook-test`                | Built-in HMAC-verified receiver (demo/testing) |

### A. Event Ingestion (`POST /events`)

**Request** (`CreateEventSchema`):

```json
{
  "eventType": "payment.succeeded",
  "payload": { "id": "evt_943892", "amount": 2500, "currency": "usd" }
}
```

**Response `201 Created`**:

```json
{
  "success": true,
  "message": "Event created successfully",
  "data": {
    "id": "cldf88239000108l23knb23p1",
    "eventType": "payment.succeeded",
    "payload": { "id": "evt_943892", "amount": 2500, "currency": "usd" },
    "createdAt": "2026-07-02T14:00:00.000Z"
  }
}
```

### B. Webhook Endpoint Creation (`POST /endpoints`)

**Request** (`CreateWebhookEndpointSchema`):

```json
{
  "url": "https://api.merchant.com/webhooks/incoming",
  "secret": "my-secure-webhook-passphrase-value",
  "subscriptions": ["payment.succeeded", "payment.failed"]
}
```

**Response `201 Created`**:

```json
{
  "success": true,
  "message": "Webhook endpoint created successfully",
  "data": {
    "id": "cldf88547000208l24knb54p2",
    "url": "https://api.merchant.com/webhooks/incoming",
    "isActive": true,
    "createdAt": "2026-07-02T14:00:00.000Z",
    "rawSecret": "my-secure-webhook-passphrase-value",
    "subscriptions": [
      { "eventType": "payment.succeeded" },
      { "eventType": "payment.failed" }
    ]
  }
}
```

---

## 9. Containerization & Environment Configuration

### Service Topology

| Service        | Compose Name     | Port (Dev)  | Port (Prod) | Image / Source                   |
| :------------- | :--------------- | :---------- | :---------- | :------------------------------- |
| PostgreSQL     | `postgres`       | `5432:5432` | internal    | `postgres:16-alpine`             |
| Redis          | `redis`          | `6379:6379` | internal    | `redis:8-alpine`                 |
| API Server     | `api`            | `3000:3000` | internal    | `api/Dockerfile.dev\|prod`       |
| Fan-Out Worker | `fanout-worker`  |             |             | same image as API                |
| Webhook Worker | `webhook-worker` |             |             | same image as API                |
| Dashboard      | `dashboard`      | `5173:5173` | `80:80`     | `dashboard/Dockerfile.dev\|prod` |

### Key Design Points

- **Dual Compose Files**: `docker-compose.dev.yml` uses `Dockerfile.dev` (hot-reload via tsx/Vite). `docker-compose.prod.yml` uses `Dockerfile.prod` (compiled Node/Nginx static bundle).
- **Shared Worker Image**: `fanout-worker` and `webhook-worker` reuse the API image, distinguished only by their startup `command` override.
- **Port Exposure**: Dev binds `5432` and `6379` to the host for direct access. Prod omits these host bindings - services communicate only on the Docker internal network.
- **Redis Prod Mode**: Persistence disabled (`--save "" --appendonly no`) - queue state is ephemeral by design.
- **Health Checks**: `api` exposes `GET /health` (checks Postgres + Redis). `dashboard` probes its Nginx port. Both used as Compose `depends_on` conditions.
- **Nginx HTTP Keep-Alive**: The production reverse proxy uses HTTP/1.1 (`proxy_http_version 1.1`), implicitly enabling persistent TCP connections (keep-alive) to backend services.
- **Env Hierarchy**: Root `.env` supplies Compose variable substitution. `api/.env` and `dashboard/.env` are for bare-metal dev runs.

### Environment Variables

**Root `.env`** — Compose-level substitution; consumed by all containers:

| Variable            | Required | Default / Example                                                | Description                                     |
| :------------------ | :------- | :--------------------------------------------------------------- | :---------------------------------------------- |
| `POSTGRES_USER`     | ✅       | `postgres`                                                       | PostgreSQL superuser name                       |
| `POSTGRES_PASSWORD` | ✅       | `postgres`                                                       | PostgreSQL superuser password                   |
| `POSTGRES_DB`       | —        | `hookfire`                                                       | Database name                                   |
| `REDIS_PASSWORD`    | ✅       | `my-redis-secure-password`                                       | Redis auth password                             |
| `ENCRYPTION_KEY`    | ✅       | _(32 chars)_                                                     | AES-256-GCM master key — exactly 32 bytes       |
| `WEBHOOK_SECRET`    | ✅       | `global-webhook-fallback-secret`                                 | Global fallback signing secret (test receiver)  |
| `ALLOWED_ORIGINS`   | ✅       | `http://localhost:5173,http://localhost:3000`                    | Comma-separated CORS origin whitelist           |
| `PORT`              | —        | `3000`                                                           | API server port                                 |
| `VITE_API_URL`      | ✅       | `http://localhost:3000`                                          | Dashboard -> API base URL (consumed in browser) |
| `APP_URL`           | ✅       | `http://api:3000` _(Docker)_ / `http://localhost:3000` _(local)_ | API base URL for demo receiver URLs             |

**`api/.env`** — Backend bare-metal runs only (overrides Compose env):

| Variable          | Required | Default / Example                                                      | Description                           |
| :---------------- | :------- | :--------------------------------------------------------------------- | :------------------------------------ |
| `DATABASE_URL`    | ✅       | `postgresql://username:password@localhost:5432/hookfire?schema=public` | Prisma connection string              |
| `REDIS_HOST`      | ✅       | `localhost` _(local)_ / `redis` _(Docker)_                             | Redis hostname                        |
| `REDIS_PORT`      | —        | `6379`                                                                 | Redis port                            |
| `REDIS_PASSWORD`  | ✅       | `my-redis-secure-password`                                             | Redis auth password                   |
| `ENCRYPTION_KEY`  | ✅       | _(32 chars)_                                                           | AES-256-GCM master key                |
| `WEBHOOK_SECRET`  | ✅       | `global-webhook-fallback-secret`                                       | Global fallback signing secret        |
| `ALLOWED_ORIGINS` | ✅       | `http://localhost:5173,http://localhost:3000`                          | Comma-separated CORS origin whitelist |
| `PORT`            | —        | `3000`                                                                 | API server port                       |
| `NODE_ENV`        | —        | `development`                                                          | Runtime environment                   |
| `APP_URL`         | ✅       | `http://localhost:3000`                                                | API base URL for demo receiver URLs   |

**`dashboard/.env`** — Frontend bare-metal runs only:

| Variable       | Required | Default / Example       | Description                           |
| :------------- | :------- | :---------------------- | :------------------------------------ |
| `VITE_API_URL` | ✅       | `http://localhost:3000` | Target API URL (runs in host browser) |

---

## 10. Local Development & Operational Commands

### A. Option 1: Unified Containerized Stack (Recommended)

```bash
# 1. Configure environment
cp .env.example .env

# 2. Start all services
docker compose -f docker-compose.dev.yml up -d --build

# 3. Apply database schema
docker compose -f docker-compose.dev.yml exec api npx prisma db push

# 4. Monitor logs
docker compose -f docker-compose.dev.yml logs -f

# 5. Shutdown (with -v to remove volumes)
docker compose -f docker-compose.dev.yml down -v
```

### B. Option 2: Bare-Metal Multi-Process

Requires: Node.js v20+, PostgreSQL, Redis locally (or via Docker).

```bash
# 1. Start Redis (dedicated infra-only compose file)
docker compose -f docker-compose.infra.yml up -d
# Postgres must be running locally or started separately

# 2. Configure and migrate
cp api/.env.example api/.env          # Set localhost DB/Redis URLs
cp dashboard/.env.example dashboard/.env
cd api && npm install && npx prisma db push && npx prisma generate

# 3. Start each process in a separate terminal
cd api && npm run dev                       # API server
cd api && npm run fanout-worker             # Fan-out worker
cd api && npm run webhook-worker            # Webhook delivery worker
cd dashboard && npm install && npm run dev  # Dashboard (Vite)
```

---

## 11. Core Architectural Trade-offs

| Design Choice                          | Rationale                                                                                                 | Trade-offs                                                            |
| :------------------------------------- | :-------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------- |
| **Two-Stage Fan-Out Queue**            | Isolates ingestion API from subscription resolution; a failing endpoint cannot block deliveries to others | Extra Redis memory for transient jobs; small added scheduling latency |
| **BullMQ DLQ**                         | Reuses BullMQ's `failed` state; `job.retry()` enables seamless manual retries from the dashboard          | Failed jobs occupy Redis memory; `removeOnFail` limits must be tuned  |
| **AES-256-GCM At-Rest Encryption**     | Secures signing secrets against raw DB leaks                                                              | Decryption overhead per delivery; single master key dependency        |
| **Timing-Safe HMAC Verification**      | Constant-time comparison neutralizes timing side-channel attacks                                          | Requires uniform buffer lengths; minor strictness overhead            |
| **Secret Rotation Grace Period (24h)** | Dual-signature delivery (`v1` + `v0`) lets receivers migrate secrets with zero downtime                   | Increases signature header complexity on both sides                   |
| **Redis Sliding-Window Rate Limiter**  | Custom per-tier limits; fail-open on Redis failure prevents user-visible disruption                       | Requires Redis availability; per-IP state occupies memory             |
| **Vite React SPA Dashboard**           | Stateless static bundle; no backend session state                                                         | Requires CORS configuration; client-side polling for metric freshness |
| **Prisma + pg Driver Adapter**         | Type-safe ORM with Prisma v7 native pg adapter for optimal connection handling                            | Schema changes require `prisma db push` or migration steps            |

---

## 12. Tech Stack Versions

| Component        | Technology                  | Version                     |
| :--------------- | :-------------------------- | :-------------------------- |
| API Runtime      | Node.js + TypeScript (tsx)  | Node >= 20, TS ^6.0         |
| Web Framework    | Express                     | ^5.2                        |
| ORM              | Prisma + @prisma/adapter-pg | ^7.8                        |
| Database         | PostgreSQL                  | 16-alpine                   |
| Queue            | BullMQ + IORedis            | BullMQ ^5.79, IORedis ^5.4  |
| Cache / Broker   | Redis                       | 8-alpine                    |
| Validation       | Zod                         | ^4.4                        |
| HTTP Client      | Axios                       | ^1.18                       |
| Logger           | Pino + pino-http            | Pino ^10.3                  |
| Dashboard        | React + Vite                | React ^19.2, Vite ^8.1      |
| Routing          | React Router DOM            | ^7.18                       |
| Containerization | Docker Compose              | Dev + Prod separate configs |

---

## 13. Future Adaptations & Scalability

1. **Transactional Outbox Pattern**: Eliminate the gap where Postgres commits but Redis is down before fan-out enqueue. Write outbox tasks in the same DB transaction; a publisher reads and dispatches them.

2. **Rate Limiting per Endpoint**: A single high-traffic endpoint can exhaust worker slots. Use BullMQ rate-limit configs or dedicated queues per service tier to provide concurrency isolation.

3. **Graceful Worker Shutdown**: Handle `SIGTERM`/`SIGINT` by calling `worker.close()`, draining active jobs before process exit to prevent mid-delivery interruptions during deployments.

4. **Circuit Breaker / Auto-Deactivation**: Auto-set `isActive: false` on endpoints after N consecutive failures to stop wasting retry cycles on permanently dead receivers.

5. **Pagination & Virtual Lists**: Push filtering/aggregation to PostgreSQL queries and render delivery log tables with windowed virtual list components to handle large datasets without DOM bloat.
