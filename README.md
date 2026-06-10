# ⚡ StreamZ

> Scalable social media automation platform for gaming content creators

StreamZ automates the entire gaming content pipeline — from live stream detection to multi-platform publishing. Capture streams, detect highlight moments using chat & audio analysis, generate AI-optimized content for every platform, and publish on schedule — all on autopilot.

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        StreamZ Architecture                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐      │
│  │  Twitch  │    │ YouTube  │    │Instagram │    │  TikTok  │      │
│  │ EventSub │    │  Push    │    │  Graph   │    │  API     │      │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘      │
│       │               │               │               │            │
│       ▼               ▼               │               │            │
│  ┌─────────────────────────┐          │               │            │
│  │   Webhook Handlers      │          │               │            │
│  │   (Next.js API Routes)  │          │               │            │
│  └───────────┬─────────────┘          │               │            │
│              │                        │               │            │
│              ▼                        │               │            │
│  ┌─────────────────────────┐          │               │            │
│  │   BullMQ Job Queues     │          │               │            │
│  │   (Redis-backed)        │          │               │            │
│  └───┬─────┬──────┬───────┘          │               │            │
│      │     │      │                  │               │            │
│      ▼     ▼      ▼                  │               │            │
│  ┌──────┐┌──────┐┌──────┐┌──────┐   │               │            │
│  │Cap-  ││High- ││Opti- ││Pub-  │   │               │            │
│  │ture  ││light ││mizer││lisher│───┘───────────────┘            │
│  │Worker││Worker││Worker││Worker│                                 │
│  └──┬───┘└──┬───┘└──┬───┘└──┬───┘                                │
│     │       │       │       │                                      │
│     ▼       ▼       ▼       ▼                                      │
│  ┌──────────────────────────────────────┐                          │
│  │     PostgreSQL (Neon)                │                          │
│  │     + Cloudflare R2 (Storage)        │                          │
│  └──────────────────────────────────────┘                          │
│                                                                     │
│  ┌──────────────────────────────────────┐                          │
│  │     Next.js Dashboard (Vercel)       │                          │
│  │     Review · Approve · Schedule      │                          │
│  └──────────────────────────────────────┘                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. Stream Online → Webhook → Capture Worker (yt-dlp + IRC)
2. Stream Ends  → Capture Complete → Highlight Worker (chat + audio analysis)
3. Highlights Found → Clip Extraction (FFmpeg) → Optimizer Worker (Claude AI)
4. AI Content Generated → Dashboard Review → Publisher Worker (API)
5. Published → Analytics Worker → Dashboard
```

---

## 🛠 Tech Stack

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Framework** | Next.js 14+ (App Router) | Dashboard & API routes |
| **Language** | TypeScript 5 | End-to-end type safety |
| **Monorepo** | Turborepo | Workspace management |
| **Database** | PostgreSQL (Neon) | Primary data store |
| **SQL Client** | postgres.js | Lightweight DB driver |
| **Job Queue** | BullMQ + Redis 7 | Async job processing |
| **Object Storage** | Cloudflare R2 (S3 API) | VOD & clip storage |
| **AI** | OpenRouter (Claude) | Content generation |
| **Stream Capture** | yt-dlp | VOD download |
| **Clip Extraction** | FFmpeg | Video processing |
| **Chat Analysis** | Custom algorithm | Spike detection |
| **Deployment** | Fly.io (workers) + Vercel (web) | Production hosting |
| **Containerization** | Docker + Docker Compose | Local development |

---

## 📁 Project Structure

```
streamz/
├── apps/
│   └── web/                    # Next.js dashboard
│       ├── src/app/            # App Router pages & API routes
│       │   ├── api/webhooks/   # Twitch & YouTube webhook handlers
│       │   └── ...             # Dashboard pages
│       └── src/lib/            # DB, Redis, Storage, AI clients
├── packages/
│   ├── shared/                 # Types, constants, Zod schemas
│   └── db/                     # Database client, migrations, seeds
├── workers/
│   ├── capture/                # Stream capture (yt-dlp + IRC)
│   ├── highlight/              # Highlight detection (chat + audio)
│   ├── optimizer/              # AI content generation (Claude)
│   └── publisher/              # Multi-platform publishing
├── infra/                      # Deployment configs (Fly.io, R2 CORS)
├── docs/                       # Project documentation
├── docker-compose.yml          # Local dev services
├── turbo.json                  # Turborepo config
└── package.json                # Root workspace config
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 20.0.0
- **Bun** >= 1.1.0
- **Docker** & Docker Compose
- **FFmpeg** (for local clip processing)

### 1. Clone & Install

```bash
git clone https://github.com/your-org/streamz.git
cd streamz
cp .env.example .env
bun install
```

### 2. Configure Environment

Edit `.env` with your credentials:

```bash
# Minimum required for local development:
DATABASE_URL=postgresql://streamz:streamz@localhost:5432/streamz
REDIS_HOST=localhost
REDIS_PORT=6379
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
OPENROUTER_API_KEY=your-key-here
```

### 3. Start Infrastructure

```bash
docker compose up -d
```

This starts:
- **Redis** on port 6379
- **PostgreSQL** on port 5432
- **MinIO** on ports 9000 (API) / 9001 (Console)

### 4. Initialize Database

```bash
bun run db:migrate
bun run db:seed
```

### 5. Start Development

```bash
# Start all services (web + workers)
bun run dev

# Or start individual services:
cd apps/web && bun run dev           # Dashboard on http://localhost:3000
cd workers/capture && bun run dev    # Capture worker
cd workers/highlight && bun run dev  # Highlight worker
cd workers/optimizer && bun run dev  # Optimizer worker
cd workers/publisher && bun run dev  # Publisher worker
```

---

## 🔧 Development Workflow

### Adding a New Feature

1. **Define types** in `packages/shared/src/types.ts`
2. **Add validation** in `packages/shared/src/schema.ts`
3. **Create migration** in `packages/db/src/migrations/`
4. **Implement logic** in the appropriate worker
5. **Add API routes** in `apps/web/src/app/api/`
6. **Build UI** in `apps/web/src/components/`

### Database Changes

```bash
# Create a new migration
# Add SQL file to packages/db/src/migrations/

# Run migrations
bun run db:migrate

# Seed with sample data
bun run db:seed
```

### Worker Development

Each worker follows this pattern:
1. Listen to its BullMQ queue
2. Validate job payload with Zod
3. Execute platform-specific logic
4. Update database records
5. Queue downstream jobs
6. Handle errors with retry logic

### Queue Names

| Queue | Worker | Purpose |
|-------|--------|---------|
| `streamz:capture` | capture-worker | Stream VOD + chat capture |
| `streamz:highlight` | highlight-worker | Highlight detection & clip extraction |
| `streamz:optimize` | optimizer-worker | AI content generation |
| `streamz:publish` | publisher-worker | Multi-platform publishing |

---

## 🚢 Deployment

### Workers → Fly.io

```bash
# Deploy capture worker
fly deploy --config infra/fly.toml --dockerfile workers/capture/Dockerfile --app streamz-capture

# Deploy highlight worker
fly deploy --config infra/fly.toml --dockerfile workers/highlight/Dockerfile --app streamz-highlight

# Deploy optimizer worker
fly deploy --config infra/fly.toml --dockerfile workers/optimizer/Dockerfile --app streamz-optimizer

# Deploy publisher worker
fly deploy --config infra/fly.toml --dockerfile workers/publisher/Dockerfile --app streamz-publisher
```

Set secrets for each worker:
```bash
fly secrets set DATABASE_URL=... REDIS_HOST=... OPENROUTER_API_KEY=...
```

### Dashboard → Vercel

```bash
cd apps/web
vercel --prod
```

### Storage → Cloudflare R2

Apply CORS configuration:
```bash
aws s3api put-bucket-cors --bucket streamz --cors-configuration file://infra/r2-cors.json --endpoint-url https://<account-id>.r2.cloudflarestorage.com
```

---

## 📡 API Documentation

### Webhook Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/webhooks/twitch` | GET | EventSub challenge verification |
| `/api/webhooks/twitch` | POST | EventSub notifications (stream.online/offline) |
| `/api/webhooks/youtube` | GET | PubSubHubbub subscription verification |
| `/api/webhooks/youtube` | POST | Push notifications for live streams |

### Job Queue API

Jobs are managed via BullMQ. To add a job programmatically:

```typescript
import { Queue } from 'bullmq';
import { QUEUES } from '@streamz/shared';

const captureQueue = new Queue(QUEUES.CAPTURE, { connection: redisConfig });

await captureQueue.add('capture-twitch', {
  streamId: 'uuid',
  platform: 'twitch',
  platformStreamId: 'twitch_stream_123',
  channelName: 'gamer123',
  startedAt: new Date().toISOString(),
});
```

---

## 🗄 Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `streams` | Tracks live stream sessions from Twitch/YouTube |
| `highlights` | Detected highlight moments with scoring |
| `ai_content` | AI-generated content per highlight + platform |
| `publish_queue` | Publishing jobs with status tracking |
| `analytics` | Performance metrics from published content |

See `packages/db/src/migrations/001_initial.sql` for the complete schema.

---

## 📋 Environment Variables

See `.env.example` for the complete list. Key variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_HOST` | ✅ | Redis hostname |
| `S3_ENDPOINT` | ✅ | R2/S3 endpoint URL |
| `OPENROUTER_API_KEY` | ✅ | OpenRouter API key for Claude |
| `TWITCH_CLIENT_ID` | Twitch | Twitch API client ID |
| `TWITCH_EVENTSUB_SECRET` | Twitch | Webhook verification secret |
| `YOUTUBE_CLIENT_ID` | YouTube | Google OAuth client ID |
| `INSTAGRAM_ACCESS_TOKEN` | Instagram | Meta Graph API token |
| `TIKTOK_CLIENT_KEY` | TikTok | TikTok API client key |

---

## 📜 License

Private — All rights reserved.

---

Built with ⚡ by the StreamZ team
