# Build Instructions

## Node Version

This project requires Node.js v24+. Use nvm to switch:

```bash
nvm use
```

## Development

```bash
npm run dev              # Start dev server
npm run dev -- --open    # Start and open browser
```

## Build & Preview

```bash
npm run build            # Production build
npm run preview          # Preview production build
```

## Code Quality

```bash
npm run check            # TypeScript type checking
npm run check:watch      # Type checking in watch mode
npm run lint             # Prettier + ESLint check
npm run format           # Auto-format with Prettier
```

## Database (Drizzle)

```bash
npm run db:generate      # Generate migrations from schema changes
npm run db:migrate       # Run pending migrations
npm run db:push          # Push schema directly to database (dev)
npm run db:studio        # Open Drizzle Studio GUI
```

## Docker

Start all services (PostgreSQL, Redis, ML service):

```bash
docker compose up -d     # Start in background
docker compose up        # Start with logs
docker compose down      # Stop all services
docker compose logs -f   # Follow logs
```

### Services

| Service | Port | Description |
|---------|------|-------------|
| app | 5173 | SvelteKit dev server |
| db | 5432 | PostgreSQL database |
| redis | 6379 | Redis for BullMQ |
| ml-service | 8000 | Python Detoxify API |

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `ML_SERVICE_URL` - ML service endpoint
