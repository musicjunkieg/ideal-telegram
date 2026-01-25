# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Charcoal** - A web application that analyzes Bluesky interactions and identifies potentially toxic users via real-time firehose monitoring, with options for auto-block, dashboard review, or email digest.

**Stack**: SvelteKit 5 + TypeScript, PostgreSQL + Drizzle, Python ML service (Detoxify), BullMQ + Redis

## Quick Reference

```bash
nvm use                  # Switch to correct Node version
npm run dev              # Start dev server
npm run check            # TypeScript check
npm run lint             # Lint check
npm run test             # Run tests
npm run test:watch       # TDD mode - tests re-run on file changes
docker compose up        # Start all services (db, redis, ml-service)
npm run db:push          # Push schema to database
```

## Documentation

Detailed documentation lives in the `docs/` folder:

- [Build Instructions](docs/build-instructions.md) - Development, build, and code quality commands
- [Testing](docs/testing.md) - TDD workflow, test patterns, and coverage goals
- [Authentication](docs/authentication.md) - OAuth flow, session management, and protected routes
- [Chainlink Usage](docs/chainlink-usage.md) - Issue tracking workflow and commands
- [Architecture](docs/architecture.md) - System design, external services, and file structure

## Documentation Guidelines

**Keep CLAUDE.md high-level.** When adding new documentation:

1. Create topic-specific files in `docs/` (e.g., `docs/api-integration.md`)
2. Reference them from this file
3. Only include quick-reference commands and project overview here

This keeps the main guidance file scannable while providing depth where needed.
