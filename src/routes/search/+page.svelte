<!-- /bravo-front/src/routes/search/+page.svelte -->
<script>
	import { onMount } from 'svelte';
	// 기존 getAccessToken() 호출 제거 (토큰 관리는 백엔드에서 함)
	import { searchQuery, searchResults } from '$lib/searchStore.js';
	import { get } from 'svelte/store';
	import { playTrack } from '$lib/trackPlayer.js';
	import { playlist } from '$lib/playlistStore.js'; // 플레이리스트 store 임포트
 
	// .env 파일에 설정된 백엔드 URL을 사용합니다.
	const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
 
	// ✅ Spotify에서 트랙 검색 (백엔드 호출)
	async function searchTracks() {
	   if (!get(searchQuery)) return;
 
	   try {
		  const res = await fetch(
			 `${backendUrl}/api/spotify/search?q=${encodeURIComponent(get(searchQuery))}`,
			 {
				headers: {
				   'Content-Type': 'application/json', // ✅ JSON 요청
				   'ngrok-skip-browser-warning': '69420', // ✅ ngrok 보안 경고 우회
				},
			 }
		  );
		  if (!res.ok) throw new Error(`HTTP 오류! 상태 코드: ${res.status}`);
		  const data = await res.json();
		  searchResults.set(data);
	   } catch (error) {
		  console.error('❌ Spotify 검색 요청 실패:', error);
	   }
	}
 
	// ✅ 플레이리스트에 트랙 추가하는 함수 (필요에 따라 수정)
	function addToPlaylist(track, index) {
		// 기존 배열에 새 트랙 추가
		playlist.update(tracks => [...tracks, track]);
		console.log('플레이리스트에 추가:', track);
	}
 
	onMount(searchTracks);
</script>
 
<div class="search-container">
	<input
	   type="text"
	   bind:value={$searchQuery}
	   placeholder="🔎 Search"
	   on:keydown={(e) => e.key === 'Enter' && searchTracks()}
	/>
	<button on:click={searchTracks}>검색</button>
</div>
 
{#if $searchResults.length > 0}
	<div class="track-list">
	   <h3>검색 결과:</h3>
	   {#each $searchResults as track, index}
		  <div class="track">
			 <img src={track.album.images[0]?.url} alt="Album Cover" />
			 <div class="track-info">
				<strong>{track.name}</strong>
				<p>{track.artists.map(artist => artist.name).join(', ')}</p>
			 </div>
			 <div class="track-buttons">
				<button class="playlist-add-btn" on:click={() => addToPlaylist(track, index)}>플레이리스트 추가</button>
				<button class="play-btn" on:click={() => playTrack(track, index)}>▶️ 재생</button>
			 </div>
		  </div>
	   {/each}
	</div>
{/if}
 
<style>
	.search-container {
	   margin-top: 5px;
	   text-align: center;
	   margin-bottom: 20px;
	   display: flex;
	   flex-direction: row;
	}
	input {
	   padding: 10px;
	   width: 60%;
	   height: 45px;
	   border: 1px solid #626262;
	   border-radius: 15px;
	   font-size: 16px;
	   box-sizing: border-box;
	   margin-right: 20px;
	   margin-left: 5px;
	   background-color: #626262;
	   color: white; /* 입력한 글자 색상 */
	   transition: border 0.5s ease, background-color 0.5s ease; /* 테두리 전환 효과 추가 */
	}
	input::placeholder {
	   color: white; /* placeholder 글자 색상 */
	}
	input:hover {
	   background-color: #7c7c7c;
	}
	input:focus {
	   outline: none;
	   border: 2px solid white;
	   background-color: #7c7c7c;
	}
	.track-list {
	   max-width: 100%;
	   text-align: left;
	}
	.track {
	   display: flex;
	   align-items: center;
	   padding: 10px;
	   border-bottom: 1px solid #ddd;
	   transition: background 0.2s;
	}
	.track:hover {
	   background: #f4f4f4;
	   color: black;
	}
	.track img {
	   width: 50px;
	   height: 50px;
	   margin-right: 10px;
	   box-shadow: 0 0 5px rgba(255, 255, 255, 0.8);
	}
	h3 {
	   margin-left: 5px;
	}
	.search-container button {
	   white-space: nowrap;
	   background: #1db954;
	   color: white;
	   border: none;
	   padding: 8px 12px;
	   font-size: 14px;
	   border-radius: 5px;
	   cursor: pointer;
	   transition: background 0.3s;
	   width: 50px;
	   height: 45px;
	}
	.search-container button:hover {
	   background: palevioletred;
	}
	.track button {
	   /* 기본 스타일은 두 버튼 모두 적용되나, 아래 클래스에서 margin-left를 오버라이드합니다 */
	   background: #1db954;
	   color: white;
	   border: none;
	   padding: 8px 12px;
	   font-size: 14px;
	   border-radius: 5px;
	   cursor: pointer;
	   transition: background 0.3s;
	   margin-left: auto;
	}
	/* 플레이리스트 추가 버튼에는 margin-left auto를 제거해 왼쪽에 위치시키고, 값 간격을 조정 */
	.track .playlist-add-btn {
	   margin-left: 0;
	   margin-right: 8px;
	}
	.track .playlist-add-btn:hover {
	   background: hotpink;
	}
	/* 재생 버튼은 오른쪽 정렬을 유지 */
	.track .play-btn {
	   margin-left: auto;
	}
	.track .play-btn:hover {
	   background-color: hotpink;
	}
	.track-buttons {
	   margin-left: auto;
	   display: flex;
	   align-items: center;
	   gap: 8px;
	}
	.track-buttons button {
	   background: #1db954;
	   color: white;
	   border: none;
	   padding: 8px 12px;
	   font-size: 14px;
	   border-radius: 5px;
	   cursor: pointer;
	   transition: background 0.3s;
	}
	.playlist-add-btn:hover {
	   background: hotpink;
	}
	.play-btn:hover {
	   background-color: hotpink;
	}
</style>
 