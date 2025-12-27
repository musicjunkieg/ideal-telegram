# Architecture

## System Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Spacedust     │────▶│  Firehose Worker │────▶│  Analysis Queue │
│   (Real-time)   │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                         │
┌─────────────────┐     ┌──────────────────┐             ▼
│  Constellation  │────▶│  SvelteKit App   │◀────┬─────────────────┐
│  (Backlinks)    │     │  (Dashboard)     │     │  ML Service     │
└─────────────────┘     └────────┬─────────┘     │  (Detoxify)     │
                                │               └─────────────────┘
                                ▼
                       ┌──────────────────┐
                       │   PostgreSQL     │
                       │   + Redis        │
                       └──────────────────┘
```

## Technology Stack

- **Framework**: SvelteKit 2 + Svelte 5 + TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **ML Service**: Python FastAPI + Detoxify
- **Job Queue**: BullMQ + Redis
- **Real-time**: Spacedust WebSocket
- **Email**: Resend

## External Services

| Service | Purpose | URL |
|---------|---------|-----|
| Constellation | Query backlinks (who replied/mentioned you) | constellation.microcosm.blue |
| Spacedust | Real-time firehose of interactions | spacedust.microcosm.blue |
| Slingshot | Identity resolution and record caching | slingshot.microcosm.blue |
| Bluesky API | User feeds, blocking, muting | public.api.bsky.app |

## File Structure

### Implemented

```
src/lib/
├── db/
│   ├── schema.ts            # Drizzle schema (users, flagged_users, toxic_evidence)
│   └── index.ts             # Database client

ml-service/
├── main.py                  # FastAPI endpoints (/health, /analyze stub)
├── requirements.txt         # Python dependencies
└── Dockerfile

docker-compose.yml           # All services (app, db, redis, ml-service)
Dockerfile                   # SvelteKit container
drizzle.config.ts            # Drizzle Kit configuration
.env.example                 # Environment template
```

### Planned

```
src/lib/
├── oauth/client.ts          # AT Protocol OAuth + DPoP handling
├── api/
│   ├── bluesky.ts           # Bluesky API client
│   ├── constellation.ts     # Backlink queries
│   └── spacedust.ts         # WebSocket firehose
├── ml/toxicity.ts           # ML service client
└── jobs/queue.ts            # BullMQ setup

src/routes/
├── auth/callback/+server.ts # OAuth callback
├── dashboard/+page.svelte   # Main dashboard
├── settings/+page.svelte    # User settings
└── api/block/+server.ts     # Block action endpoint

workers/                     # Background workers (firehose, digest)
```

## Database Schema

### users
Primary table for authenticated Bluesky users.

| Column | Type | Description |
|--------|------|-------------|
| did | text (PK) | Bluesky DID |
| handle | text | Bluesky handle |
| email | text | Email for digests |
| action_mode | enum | auto_block, dashboard, email_digest |
| toxicity_threshold | real | Score threshold (default 0.7) |
| monitoring_enabled | boolean | Enable/disable monitoring |

### flagged_users
Users identified as potentially toxic.

| Column | Type | Description |
|--------|------|-------------|
| id | serial (PK) | Auto-increment ID |
| owner_did | text (FK) | User who owns this flag |
| flagged_did | text | DID of flagged user |
| aggregate_toxicity_score | real | Combined score |
| toxic_post_count | integer | Number of toxic posts |
| status | enum | pending, blocked, muted, dismissed |

### toxic_evidence
Individual toxic posts/interactions as evidence.

| Column | Type | Description |
|--------|------|-------------|
| id | serial (PK) | Auto-increment ID |
| flagged_user_id | integer (FK) | Reference to flagged_users |
| post_uri | text | AT Protocol URI of post |
| post_text | text | Content of post |
| toxicity_scores | jsonb | All category scores |
| primary_category | text | Highest-scoring category |
| interaction_type | enum | reply, mention, quote |

## Key Considerations

- **Rate Limiting**: Bluesky API limited to 10 req/s - implement token bucket
- **Privacy**: Blocks are public on Bluesky; mutes are private
- **Bluesky DIDs**: User identities are DIDs (decentralized identifiers), not handles
