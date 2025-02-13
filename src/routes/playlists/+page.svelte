<script>
	import { playlistManager } from '$lib/playlistManagerStore.js';
</script>

<div class="playlists-container">
	<h1>생성된 플레이리스트</h1>
	{#if $playlistManager.length > 0}
		<ul>
			{#each $playlistManager as pl}
				<li class="playlist-item">
					<strong>{pl.name}</strong>
					<span>({pl.tracks.length} 곡)</span>
				</li>
			{/each}
		</ul>
	{:else}
		<p>생성된 플레이리스트가 없습니다.</p>
	{/if}
</div>

<style>
	.playlists-container {
		padding: 20px;
		color: black;
	}
	.playlist-item {
		padding: 10px;
		border-bottom: 1px solid #ccc;
	}
</style> 