# Testing

This project uses **Vitest** for unit and integration testing with a **TDD (Test-Driven Development)** approach.

## Philosophy

- **Write tests first**: Before implementing a feature, write failing tests that describe the expected behavior
- **Red-Green-Refactor**: Write a failing test (red), make it pass (green), then refactor
- **Test behavior, not implementation**: Tests should verify what code does, not how it does it
- **Keep tests fast**: Unit tests should run in milliseconds

## Commands

```bash
npm run test              # Run all tests once
npm run test:watch        # Run tests in watch mode (TDD workflow)
npm run test:coverage     # Run tests with coverage report
npm run test:ui           # Open Vitest UI for visual debugging
```

## File Conventions

| Pattern | Location | Purpose |
|---------|----------|---------|
| `*.test.ts` | Next to source file | Unit tests |
| `*.integration.test.ts` | Next to source file | Integration tests |
| `src/tests/*.ts` | Dedicated folder | Shared test utilities, fixtures |

Example structure:
```
src/lib/oauth/
├── client.ts
├── client.test.ts           # Unit tests for client.ts
└── client.integration.test.ts  # Integration tests (may need real services)

src/routes/client-metadata.json/
├── +server.ts
└── +server.test.ts          # Endpoint tests
```

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { calculateToxicityScore } from './toxicity';

describe('calculateToxicityScore', () => {
  it('returns 0 for empty input', () => {
    expect(calculateToxicityScore('')).toBe(0);
  });

  it('returns score between 0 and 1', () => {
    const score = calculateToxicityScore('some text');
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});
```

### Endpoint Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { GET } from './+server';

describe('GET /client-metadata.json', () => {
  it('returns valid OAuth client metadata', async () => {
    const response = await GET({
      url: new URL('http://localhost:5173/client-metadata.json')
    });

    const data = await response.json();

    expect(data.client_id).toBe('http://localhost:5173/client-metadata.json');
    expect(data.dpop_bound_access_tokens).toBe(true);
    expect(data.grant_types).toContain('authorization_code');
  });
});
```

### Mocking

Use Vitest's built-in mocking for external dependencies:

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { fetchUserProfile } from './bluesky';

// Mock the fetch function
vi.mock('$lib/api/client', () => ({
  apiClient: {
    get: vi.fn()
  }
}));

describe('fetchUserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and returns user profile', async () => {
    // ... test implementation
  });
});
```

## TDD Workflow

1. **Understand the requirement**: What should the code do?
2. **Write a failing test**: Express the requirement as a test
3. **Run the test**: Verify it fails for the right reason
4. **Write minimal code**: Just enough to make the test pass
5. **Run the test**: Verify it passes
6. **Refactor**: Clean up while keeping tests green
7. **Repeat**: Add the next test case

## Coverage Goals

- **Minimum**: 70% coverage for new code
- **Target**: 85% coverage overall
- **Critical paths**: 100% coverage for auth, blocking, and payment flows

## CI Integration

Tests run automatically on:
- Pull request creation/update
- Push to main branch

PRs cannot be merged if tests fail.
