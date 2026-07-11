# Hookfire 🔥

Hookfire is a production-inspired, decoupled, event-driven webhook delivery engine. It separates high-throughput API ingestion from asynchronous webhook delivery using distributed background queues.

## 📖 Key Documentation

*   **[Architecture & System Design](ARCHITECTURE.md)**: Detailed system blueprint, data models, queue retry mechanics, security/encryption specifications, and trade-offs.
*   **[Deployment Guide](DEPLOYMENT.md)**: Steps for deploying to production (AWS EC2 + Docker Compose) with Nginx reverse proxy, PostgreSQL persistence, and health check monitoring.

---

## 🛠️ Technology Stack

*   **Runtime/Backend**: Node.js, Express 5, TypeScript 6
*   **Database/ORM**: PostgreSQL 16, Prisma 7 (using native `@prisma/adapter-pg` pool)
*   **Queue/Broker**: Redis 8, BullMQ 5
*   **Frontend/Dashboard**: React 19, Vite 8, React Router 7
*   **Logging/Validation**: Pino Logger, Zod validation

---

## 🚀 Quick Start (Development)

### Prerequisites
*   Docker & Docker Compose

### 1. Setup Environment
Clone the repository and copy the environment template:
```bash
cp .env.example .env
```

### 2. Start the Stack (Docker Compose)
Spin up the database, cache, Express API, workers, and React dashboard:
```bash
docker compose -f docker-compose.dev.yml up -d --build
```

### 3. Push Database Schema
Initialize the database tables via Prisma:
```bash
docker compose -f docker-compose.dev.yml exec api npx prisma db push
```

The services will be available at:
*   **React Dashboard**: [http://localhost:5173](http://localhost:5173)
*   **API Server**: [http://localhost:3000](http://localhost:3000)

For full local development setup (including bare-metal running) and production deployment, please refer to [ARCHITECTURE.md](ARCHITECTURE.md) and [DEPLOYMENT.md](DEPLOYMENT.md).
