# Authentication

This document covers the OAuth authentication flow and session management for Bluesky Toxicity Shield.

## Overview

The application uses AT Protocol OAuth with DPoP (Demonstration of Proof-of-Possession) for secure authentication with Bluesky. Sessions are stored in encrypted cookies.

## OAuth Flow

### 1. Login Initiation

**Endpoint**: `GET /auth/login?handle=user.bsky.social` or `POST /auth/login` (form body)

The user provides their Bluesky handle, and the app redirects them to their authorization server:

```typescript
// From src/routes/auth/login/+server.ts
const client = getOAuthClient();
const authUrl = await client.authorize(handle, {
	scope: 'atproto transition:generic'
});
return Response.redirect(authUrl);
```

### 2. OAuth Callback

**Endpoint**: `GET /auth/callback`

After the user authorizes, Bluesky redirects back with an authorization code:

```typescript
// From src/routes/auth/callback/+server.ts
const result = await client.callback(params);
const did = result.session.did;
const handle = await resolveHandle(did); // Fetch from Bluesky API

createSession(cookies, { did, handle, expiresAt }, SESSION_SECRET);
```

### 3. Logout

**Endpoint**: `GET /auth/logout` or `POST /auth/logout`

Revokes OAuth tokens at the authorization server and clears the session:

```typescript
// From src/routes/auth/logout/+server.ts
async function revokeTokens(did: string | undefined): Promise<void> {
	if (!did) return;
	try {
		const client = getOAuthClient();
		await client.revoke(did);
	} catch (error) {
		// Log but don't fail - user should still be logged out
		console.error('Failed to revoke OAuth tokens:', error);
	}
}

export const POST: RequestHandler = async ({ cookies, locals }) => {
	await revokeTokens(locals.user?.did);
	destroySession(cookies);
	return Response.redirect('/');
};
```

Token revocation failures are logged but don't prevent logout - the user's local session is always cleared.

## Session Management

### Session Data Structure

```typescript
interface Session {
	did: string; // Bluesky DID (e.g., "did:plc:abc123")
	handle: string; // Bluesky handle (e.g., "user.bsky.social")
	expiresAt: number; // Timestamp when session expires
}
```

### Encryption

Sessions are encrypted with AES-256-GCM before storing in cookies:

- **Algorithm**: AES-256-GCM
- **Key**: 32-byte key from `SESSION_SECRET` env var
- **IV**: Random 12 bytes per encryption
- **Auth Tag**: 16 bytes for integrity verification

```typescript
import { encryptSession, decryptSession } from '$lib/session';

// Encrypt before storing
const encrypted = encryptSession(session, secretKey);
// { iv: "base64...", data: "base64...", tag: "base64..." }

// Decrypt when reading
const session = decryptSession(encrypted, secretKey);
```

### Cookie Configuration

| Property | Value         | Purpose                   |
| -------- | ------------- | ------------------------- |
| Name     | `bts_session` | Session cookie identifier |
| httpOnly | `true`        | Prevent XSS access        |
| secure   | `true`        | HTTPS only                |
| sameSite | `lax`         | CSRF protection           |
| path     | `/`           | Available site-wide       |
| maxAge   | 7 days        | Session duration          |

### Auto-Refresh

Sessions are automatically refreshed when within 1 day of expiration. This happens in the server hook middleware:

```typescript
// From src/hooks.server.ts
if (shouldRefreshSession(session)) {
	refreshSession(cookies, session, SESSION_SECRET);
}
```

## Protected Routes

### Using Guards

Two guards are available in `$lib/auth`:

#### `requireAuth(locals, redirectTo?)`

Throws a redirect if not authenticated. Use in load functions:

```typescript
// src/routes/dashboard/+page.server.ts
import { requireAuth } from '$lib/auth';

export const load = ({ locals }) => {
	const user = requireAuth(locals);
	// User is guaranteed to exist here
	return { user };
};
```

#### `redirectIfAuthenticated(locals, redirectTo?)`

Throws a redirect if already authenticated. Use on login pages:

```typescript
// src/routes/login/+page.server.ts
import { redirectIfAuthenticated } from '$lib/auth';

export const load = ({ locals }) => {
	redirectIfAuthenticated(locals, '/dashboard');
	// Only unauthenticated users reach here
};
```

### Accessing User in Routes

The current user is available in `locals.user`:

```typescript
// +page.server.ts
export const load = ({ locals }) => {
	if (locals.user) {
		return { user: locals.user };
	}
	return { user: null };
};
```

```svelte
<!-- +page.svelte -->
<script>
	let { data } = $props();
</script>

{#if data.user}
	<p>Welcome, {data.user.handle}!</p>
{:else}
	<a href="/auth/login">Login</a>
{/if}
```

## OAuth Session Storage

The OAuth client needs to store session and state data for the OAuth flow. Two storage backends are available:

### Redis Storage (Production)

For production deployments, use Redis-backed stores for persistence across server restarts:

```typescript
import { createRedisStores } from '$lib/oauth/redis-stores';

const { sessionStore, stateStore } = createRedisStores(process.env.REDIS_URL);
```

Features:
- **Session TTL**: Automatically expires based on token expiration time
- **State TTL**: 10 minutes for OAuth state (PKCE verifiers)
- **Key prefixes**: `oauth:session:` and `oauth:state:` for easy management

### Memory Storage (Development)

For local development, in-memory stores work fine:

```typescript
import { MemorySessionStore, MemoryStateStore } from '$lib/oauth/stores';
```

## Environment Variables

| Variable         | Description                                        | Example                                        |
| ---------------- | -------------------------------------------------- | ---------------------------------------------- |
| `SESSION_SECRET` | 32-byte base64-encoded key for session encryption  | `0uNTnZMGtmCICdv/NYubOJEvZQ1LPrlvsQOHmWnzz+E=` |
| `PUBLIC_URL`     | Public URL of the application (for OAuth redirect) | `https://toxicity-shield.example.com`          |
| `REDIS_URL`      | Redis connection URL for OAuth session storage     | `redis://localhost:6379`                       |

### Generating a Session Secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Security Considerations

1. **DPoP Tokens**: All API requests use proof-of-possession tokens that are bound to specific requests
2. **Session Encryption**: Sensitive data never stored in plaintext cookies
3. **httpOnly Cookies**: Sessions cannot be accessed by client-side JavaScript
4. **CSRF Protection**: `sameSite=lax` prevents cross-origin form submissions
5. **Handle Resolution**: Handles are fetched server-side from Bluesky API, not trusted from OAuth response
6. **Token Revocation**: OAuth tokens are revoked at the authorization server on logout

## Testing

Auth routes have comprehensive test coverage. Run tests:

```bash
npm run test -- src/routes/auth
npm run test -- src/lib/session
npm run test -- src/lib/auth
```

See [testing.md](./testing.md) for TDD patterns and mocking strategies.
