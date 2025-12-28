<script lang="ts">
	import { enhance } from '$app/forms';

	let handle = $state('');
	let isSubmitting = $state(false);
	let isFocused = $state(false);
</script>

<svelte:head>
	<title>Sign In - Charcoal</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;1,9..144,300&family=Source+Sans+3:wght@400;500;600&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="sanctuary">
	<!-- Ambient background layers -->
	<div class="bg-layer bg-gradient"></div>
	<div class="bg-layer bg-grain"></div>
	<div class="bg-layer bg-glow"></div>

	<main class="container">
		<!-- Floating protective shapes -->
		<div class="floating-shapes" aria-hidden="true">
			<div class="shape shape-1"></div>
			<div class="shape shape-2"></div>
			<div class="shape shape-3"></div>
		</div>

		<div class="content">
			<header class="header">
				<div class="shield-icon" aria-hidden="true">
					<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path
							d="M24 4L6 12v12c0 11.1 7.8 21.47 18 24 10.2-2.53 18-12.9 18-24V12L24 4z"
							fill="currentColor"
							opacity="0.15"
						/>
						<path
							d="M24 4L6 12v12c0 11.1 7.8 21.47 18 24 10.2-2.53 18-12.9 18-24V12L24 4z"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							fill="none"
						/>
						<path
							d="M17 24l4 4 10-10"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</div>
				<h1 class="title">Charcoal</h1>
				<p class="subtitle">Your peaceful corner of Bluesky</p>
			</header>

			<div class="card" class:focused={isFocused}>
				<div class="card-glow"></div>
				<div class="card-content">
					<p class="welcome-text">
						We'll help you enjoy a calmer, kinder feed by identifying interactions that might
						disrupt your peace.
					</p>

					<form
						method="POST"
						action="/auth/login"
						use:enhance={() => {
							isSubmitting = true;
							return async ({ update }) => {
								await update();
								isSubmitting = false;
							};
						}}
					>
						<div class="input-group">
							<label for="handle" class="label">Your Bluesky handle</label>
							<div class="input-wrapper" class:focused={isFocused}>
								<span class="input-prefix">@</span>
								<input
									type="text"
									id="handle"
									name="handle"
									bind:value={handle}
									onfocus={() => (isFocused = true)}
									onblur={() => (isFocused = false)}
									placeholder="yourname.bsky.social"
									autocomplete="username"
									autocapitalize="none"
									autocorrect="off"
									spellcheck="false"
									required
									disabled={isSubmitting}
								/>
							</div>
							<p class="input-hint">We'll redirect you to Bluesky to authorize securely</p>
						</div>

						<button type="submit" class="submit-btn" disabled={!handle.trim() || isSubmitting}>
							{#if isSubmitting}
								<span class="spinner"></span>
								<span>Connecting...</span>
							{:else}
								<span>Continue to Bluesky</span>
								<svg
									class="arrow-icon"
									viewBox="0 0 20 20"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										d="M4 10h12m0 0l-4-4m4 4l-4 4"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
								</svg>
							{/if}
						</button>
					</form>
				</div>
			</div>

			<footer class="footer">
				<p class="footer-text">
					Your privacy matters. We only access what's needed to protect your experience.
				</p>
			</footer>
		</div>
	</main>
</div>

<style>
	/* ===== CSS Variables ===== */
	:root {
		--color-sage-50: #f6f7f6;
		--color-sage-100: #e8ebe7;
		--color-sage-200: #d4dbd2;
		--color-sage-300: #b5c2b1;
		--color-sage-400: #8fa388;
		--color-sage-500: #6b8563;
		--color-sage-600: #566b4f;
		--color-sage-700: #455541;
		--color-sage-800: #3a4637;
		--color-sage-900: #313b2f;

		--color-cream-50: #fdfcfa;
		--color-cream-100: #faf8f3;
		--color-cream-200: #f5f0e6;

		--color-lavender-100: #f3f0f7;
		--color-lavender-200: #e5dff0;
		--color-lavender-300: #d1c7e3;
		--color-lavender-400: #b5a4d1;

		--color-text-primary: #2d3529;
		--color-text-secondary: #5a6356;
		--color-text-muted: #7d8778;

		--font-display: 'Fraunces', Georgia, serif;
		--font-body: 'Source Sans 3', system-ui, sans-serif;

		--ease-gentle: cubic-bezier(0.4, 0, 0.2, 1);
		--ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	/* ===== Reset & Base ===== */
	* {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
	}

	.sanctuary {
		min-height: 100vh;
		min-height: 100dvh;
		position: relative;
		overflow: hidden;
		font-family: var(--font-body);
		color: var(--color-text-primary);
		-webkit-font-smoothing: antialiased;
	}

	/* ===== Background Layers ===== */
	.bg-layer {
		position: fixed;
		inset: 0;
		pointer-events: none;
	}

	.bg-gradient {
		background: linear-gradient(
			155deg,
			var(--color-cream-100) 0%,
			var(--color-sage-200) 25%,
			var(--color-lavender-200) 50%,
			var(--color-sage-300) 75%,
			var(--color-lavender-300) 100%
		);
	}

	.bg-grain {
		opacity: 0.35;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
	}

	.bg-glow {
		background:
			radial-gradient(ellipse 90% 70% at 30% 10%, rgba(181, 194, 177, 0.5) 0%, transparent 50%),
			radial-gradient(ellipse 70% 60% at 80% 30%, rgba(209, 199, 227, 0.45) 0%, transparent 45%),
			radial-gradient(ellipse 80% 50% at 20% 80%, rgba(181, 164, 209, 0.35) 0%, transparent 50%),
			radial-gradient(ellipse 60% 60% at 70% 90%, rgba(143, 163, 136, 0.4) 0%, transparent 45%);
	}

	/* ===== Container ===== */
	.container {
		position: relative;
		min-height: 100vh;
		min-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
	}

	.content {
		width: 100%;
		max-width: 420px;
		animation: fadeIn 0.8s var(--ease-gentle) forwards;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* ===== Floating Shapes ===== */
	.floating-shapes {
		position: fixed;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
	}

	.shape {
		position: absolute;
		border-radius: 50%;
		background: linear-gradient(135deg, var(--color-sage-300) 0%, var(--color-lavender-300) 100%);
		opacity: 0.55;
		filter: blur(50px);
		animation: float 20s ease-in-out infinite;
	}

	.shape-1 {
		width: 450px;
		height: 450px;
		top: -15%;
		right: -10%;
		animation-delay: 0s;
		background: linear-gradient(135deg, var(--color-sage-400) 0%, var(--color-lavender-300) 100%);
	}

	.shape-2 {
		width: 350px;
		height: 350px;
		bottom: 5%;
		left: -8%;
		animation-delay: -7s;
	}

	.shape-3 {
		width: 300px;
		height: 300px;
		bottom: -8%;
		right: 15%;
		animation-delay: -14s;
		background: linear-gradient(135deg, var(--color-lavender-400) 0%, var(--color-sage-400) 100%);
	}

	@keyframes float {
		0%,
		100% {
			transform: translate(0, 0) scale(1);
		}
		33% {
			transform: translate(20px, -30px) scale(1.05);
		}
		66% {
			transform: translate(-15px, 20px) scale(0.95);
		}
	}

	/* ===== Header ===== */
	.header {
		text-align: center;
		margin-bottom: 2rem;
		animation: fadeIn 0.8s var(--ease-gentle) 0.1s backwards;
	}

	.shield-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 64px;
		height: 64px;
		margin-bottom: 1rem;
		color: var(--color-sage-500);
	}

	.shield-icon svg {
		width: 100%;
		height: 100%;
	}

	.title {
		font-family: var(--font-display);
		font-size: 2rem;
		font-weight: 400;
		letter-spacing: -0.02em;
		color: var(--color-text-primary);
		margin-bottom: 0.5rem;
	}

	.subtitle {
		font-size: 1.125rem;
		color: var(--color-text-secondary);
		font-weight: 400;
	}

	/* ===== Card ===== */
	.card {
		position: relative;
		background: rgba(255, 255, 255, 0.7);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border-radius: 24px;
		border: 1px solid rgba(255, 255, 255, 0.8);
		box-shadow:
			0 4px 24px rgba(49, 59, 47, 0.06),
			0 1px 3px rgba(49, 59, 47, 0.04);
		overflow: hidden;
		transition: all 0.4s var(--ease-gentle);
		animation: fadeIn 0.8s var(--ease-gentle) 0.2s backwards;
	}

	.card.focused {
		box-shadow:
			0 8px 40px rgba(107, 133, 99, 0.12),
			0 2px 8px rgba(49, 59, 47, 0.06);
		border-color: var(--color-sage-200);
	}

	.card-glow {
		position: absolute;
		inset: 0;
		background: radial-gradient(
			ellipse 100% 100% at 50% 0%,
			rgba(181, 194, 177, 0.15) 0%,
			transparent 70%
		);
		pointer-events: none;
	}

	.card-content {
		position: relative;
		padding: 2rem;
	}

	.welcome-text {
		font-size: 0.9375rem;
		line-height: 1.6;
		color: var(--color-text-secondary);
		text-align: center;
		margin-bottom: 1.75rem;
	}

	/* ===== Form ===== */
	.input-group {
		margin-bottom: 1.5rem;
	}

	.label {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text-primary);
		margin-bottom: 0.5rem;
	}

	.input-wrapper {
		display: flex;
		align-items: center;
		background: var(--color-cream-50);
		border: 2px solid var(--color-sage-200);
		border-radius: 14px;
		padding: 0 1rem;
		transition: all 0.25s var(--ease-gentle);
	}

	.input-wrapper.focused {
		border-color: var(--color-sage-400);
		background: white;
		box-shadow: 0 0 0 4px rgba(107, 133, 99, 0.1);
	}

	.input-prefix {
		font-size: 1rem;
		color: var(--color-text-muted);
		margin-right: 0.25rem;
		font-weight: 500;
	}

	.input-wrapper input {
		flex: 1;
		border: none;
		background: transparent;
		padding: 0.875rem 0;
		font-size: 1rem;
		font-family: var(--font-body);
		color: var(--color-text-primary);
		outline: none;
	}

	.input-wrapper input::placeholder {
		color: var(--color-text-muted);
		opacity: 0.7;
	}

	.input-wrapper input:disabled {
		opacity: 0.6;
	}

	.input-hint {
		font-size: 0.8125rem;
		color: var(--color-text-muted);
		margin-top: 0.625rem;
		text-align: center;
	}

	/* ===== Submit Button ===== */
	.submit-btn {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 1rem 1.5rem;
		font-size: 1rem;
		font-weight: 600;
		font-family: var(--font-body);
		color: white;
		background: linear-gradient(135deg, var(--color-sage-500) 0%, var(--color-sage-600) 100%);
		border: none;
		border-radius: 14px;
		cursor: pointer;
		transition: all 0.3s var(--ease-gentle);
		box-shadow:
			0 2px 8px rgba(86, 107, 79, 0.25),
			inset 0 1px 0 rgba(255, 255, 255, 0.15);
	}

	.submit-btn:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow:
			0 4px 16px rgba(86, 107, 79, 0.35),
			inset 0 1px 0 rgba(255, 255, 255, 0.15);
	}

	.submit-btn:active:not(:disabled) {
		transform: translateY(0);
	}

	.submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.arrow-icon {
		width: 20px;
		height: 20px;
		transition: transform 0.25s var(--ease-gentle);
	}

	.submit-btn:hover:not(:disabled) .arrow-icon {
		transform: translateX(3px);
	}

	.spinner {
		width: 18px;
		height: 18px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* ===== Footer ===== */
	.footer {
		margin-top: 1.5rem;
		animation: fadeIn 0.8s var(--ease-gentle) 0.4s backwards;
	}

	.footer-text {
		font-size: 0.8125rem;
		color: var(--color-text-muted);
		text-align: center;
		line-height: 1.5;
	}

	/* ===== Responsive ===== */
	@media (max-width: 480px) {
		.container {
			padding: 1.5rem;
		}

		.title {
			font-size: 1.75rem;
		}

		.card-content {
			padding: 1.5rem;
		}

		.shield-icon {
			width: 56px;
			height: 56px;
		}
	}

	/* ===== Reduced Motion ===== */
	@media (prefers-reduced-motion: reduce) {
		.shape,
		.content,
		.header,
		.card,
		.footer {
			animation: none;
		}

		.card,
		.input-wrapper,
		.submit-btn {
			transition: none;
		}

		.spinner {
			animation: none;
			border-top-color: rgba(255, 255, 255, 0.7);
		}
	}
</style>
