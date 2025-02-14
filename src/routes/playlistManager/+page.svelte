<script>
	import { onMount, getContext } from 'svelte';
	import { playlistManager } from '$lib/playlistManagerStore.js';
	import { getYouTubeVideo } from '$lib/trackPlayer.js';

	const currentUser = getContext("currentUser");
	let userEmail = "";
	if (currentUser && currentUser.email) {
		userEmail = currentUser.email;
	}
	const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

	let expandedGroups = {};
	let activeTrack = null;

	function toggleGroup(playlistId) {
		expandedGroups[playlistId] = !expandedGroups[playlistId];
	}

	// 트랙 선택 시, title 필드를 fallback으로 사용하여 videoId를 가져옵니다.
	async function selectTrack(track) {
		// 데이터베이스에 트랙 제목은 'title'로 저장되어 있습니다.
		const trackName = track.name || track.title;
		const artistName = track.artist;

		if (!track.videoId && trackName && artistName) {
			const videoId = await getYouTubeVideo(trackName, artistName);
			activeTrack = { ...track, videoId };
		} else {
			activeTrack = track;
		}
	}

	onMount(async () => {
		if (userEmail) {
			try {
				const res = await fetch(`${backendUrl}/api/playlist?user_id=${userEmail}`);
				if (!res.ok) {
					throw new Error("플레이리스트 조회 실패");
				}
				const playlists = await res.json();
				playlistManager.set(playlists);
			} catch (error) {
				console.error(error);
			}
		}
	});
</script>

{#if !userEmail}
	<div class="login-prompt">
		플레이리스트를 확인하려면 로그인이 필요합니다. 로그인 페이지로 이동해주세요.
	</div>
{:else}
	<div class="playlist-manager-container">
		<h2>{userEmail}의 플레이리스트</h2>
		{#if $playlistManager.length > 0}
			<div class="playlist-group-list">
				{#each $playlistManager as playlist (playlist._id)}
					<div class="playlist-group">
						<button type="button" on:click={() => toggleGroup(playlist._id)} class="playlist-group-header">
							<span>{playlist.name}</span>
							<span class="toggle-icon">
								{#if expandedGroups[playlist._id]}
									&#9660;
								{:else}
									&#9658;
								{/if}
							</span>
						</button>
						{#if expandedGroups[playlist._id]}
							<div class="playlist-tracks">
								{#each playlist.tracks as track}
									<div class="track">
										<img src={track.albumImage} alt={track.name || track.title} class="track-album"/>
										<div class="track-info">
											<strong>{track.name || track.title}</strong>
											<p>{track.artist}</p>
										</div>
										<button type="button" on:click={() => selectTrack(track)} class="play-btn">▶️</button>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<p>등록된 플레이리스트가 없습니다.</p>
		{/if}
		{#if activeTrack}
			<div class="active-track">
				<h3>Now Playing: {activeTrack.name || activeTrack.title} - {activeTrack.artist}</h3>
				{#if activeTrack.videoId}
					<iframe
						title="YouTube video player"
						width="560"
						height="315"
						src={`https://www.youtube.com/embed/${activeTrack.videoId}?autoplay=1`}
						frameborder="0"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
						allowfullscreen>
					</iframe>
				{:else}
					<p>재생 가능한 영상이 없습니다.</p>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style>
	/* 기존 스타일 그대로 */
	.playlist-manager-container {
		max-width: 800px;
		margin: 0 auto;
		padding: 20px;
	}
	h2 {
		text-align: center;
		margin-bottom: 20px;
	}
	.playlist-group {
		margin-bottom: 20px;
		border: 1px solid #ddd;
		border-radius: 8px;
		overflow: hidden;
	}
	.playlist-group-header {
		width: 100%;
		background-color: #1db954;
		color: white;
		border: none;
		padding: 12px;
		font-size: 18px;
		text-align: left;
		display: flex;
		justify-content: space-between;
		align-items: center;
		cursor: pointer;
		transition: background-color 0.3s;
	}
	.playlist-group-header:hover {
		background-color: #17a048;
	}
	.playlist-tracks {
		background: #f9f9f9;
		padding: 10px;
	}
	.track {
		display: flex;
		align-items: center;
		padding: 8px 0;
		border-bottom: 1px solid #eee;
	}
	.track:last-child {
		border-bottom: none;
	}
	.track-album {
		width: 50px;
		height: 50px;
		margin-right: 10px;
		box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
	}
	.track-info strong {
		display: block;
		font-size: 16px;
	}
	.track-info p {
		margin: 0;
		font-size: 14px;
		color: #666;
	}
	.play-btn {
		margin-left: auto;
		background-color: #1db954;
		border: none;
		color: white;
		padding: 8px 12px;
		font-size: 14px;
		border-radius: 5px;
		cursor: pointer;
		transition: background 0.3s;
	}
	.play-btn:hover {
		background-color: hotpink;
	}
	.active-track {
		margin-top: 20px;
		text-align: center;
	}
	.login-prompt {
		text-align: center;
		margin-top: 50px;
		font-size: 1.5rem;
		color: #666;
	}
</style>