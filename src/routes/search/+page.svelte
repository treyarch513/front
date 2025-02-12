<!-- /bravo-front/src/routes/search/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	// 기존 getAccessToken() 호출 제거 (토큰 관리는 백엔드에서 함)
	import { searchQuery, searchResults } from '$lib/searchStore.js';
	import { get } from 'svelte/store';
	import { playTrack } from '$lib/trackPlayer.js';
 
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
 
	onMount(searchTracks);
 </script>
 
 <div class="search-container">
	<input
	   type="text"
	   bind:value={$searchQuery}
	   placeholder="🎵 검색할 곡 제목을 입력하세요..."
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
			 <div>
				<strong>{track.name}</strong>
				<p>{track.artists.map((artist: any) => artist.name).join(', ')}</p>
			 </div>
			 <button on:click={() => playTrack(track, index)}>▶️ 재생</button>
		  </div>
	   {/each}
	</div>
 {/if}
 
 <style>
	.search-container {
	   text-align: center;
	   margin-bottom: 20px;
	   display: flex;
	   flex-direction: row;
	}
	input {
	   padding: 10px;
	   width: 60%;
	   height: 45px;
	   border: 1px solid #ccc;
	   border-radius: 5px;
	   font-size: 16px;
	   box-sizing: border-box;
	   margin-right: 20px;
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
	   background: #1db954;
	   color: white;
	   border: none;
	   padding: 8px 12px;
	   font-size: 14px;
	   border-radius: 5px;
	   cursor: pointer;
	   transition: background 0.3s;
	   margin-left: 10px;
	}
	.track button:hover {
	   background-color: hotpink;
	}
 </style>
 