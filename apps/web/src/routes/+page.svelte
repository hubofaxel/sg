<div class="home">
	<h1>SHIP GAME</h1>
	<p class="tagline">ARCADE SHOOTER</p>
	<nav>
		<a href="/play" class="nav-btn primary">PLAY</a>
		<a href="/settings" class="nav-btn">SETTINGS</a>
	</nav>
</div>

<style>
	.home {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		background: #0a0a1a;
		font-family: 'Courier New', monospace;
		color: #e0e0e0;
		padding: 1rem;
	}

	h1 {
		font-size: clamp(1.5rem, 4vw + 1rem, 3rem);
		color: #fff;
		margin: 0;
		letter-spacing: 8px;
	}

	.tagline {
		font-size: clamp(0.625rem, 1.5vw, 0.875rem);
		color: #888;
		letter-spacing: 6px;
		margin: 0.5rem 0 3rem;
	}

	nav {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: min(240px, 80vw);
	}

	.nav-btn {
		display: block;
		text-align: center;
		padding: 12px 24px;
		min-height: 44px;
		font-family: 'Courier New', monospace;
		font-size: clamp(0.875rem, 2vw, 1rem);
		letter-spacing: 3px;
		text-decoration: none;
		border: 1px solid #555;
		color: #ccc;
		background: transparent;
		transition:
			border-color 0.15s,
			color 0.15s;
	}
	.nav-btn:hover {
		border-color: #00ff88;
		color: #fff;
	}
	.nav-btn.primary {
		border-color: #00ff88;
		color: #00ff88;
	}
	.nav-btn.primary:hover {
		background: #00ff8815;
	}
</style>
