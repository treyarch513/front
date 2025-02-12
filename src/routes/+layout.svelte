<!-- /bravo-front/src/routes/+layout.svelte -->
<script>
	import { onMount } from 'svelte';
	// 백엔드에서 Spotify 토큰 관리를 하므로 getAccessToken 호출 제거
	import { setContext } from 'svelte'; // ✅ `setContext`를 명확하게 import
	import { writable, get } from 'svelte/store'; // ✅ writable 추가
	import { page } from '$app/stores'; // ← 추가!
 
	import { youtubeApiKey } from '$lib/youtubeStore.js';
	import { searchResults } from '$lib/searchStore.js'; // ✅ 추가
	import { playTrack } from '$lib/trackPlayer.js';
	import { goto } from '$app/navigation'; //곡 상세페이지로 넘어가는 함수
	import * as jwt_decode from 'jwt-decode';
 
	const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
 
 
 // 로그인 상태 및 사용자 정보
 let isLoggedIn = false;
 let user = { name: '', picture: '' };
 
 
	console.log("백엔드 URL:", import.meta.env.VITE_BACKEND_URL);
 
 
	let isPlaying = false;
	let youtubePlayer;
	let currentYouTubeVideoId = null;
	let currentTrackIndex = -1; // ✅ 현재 재생 중인 곡의 인덱스 추가
 
	// 로그아웃: 로컬 스토리지에서 토큰 삭제 후 메인 페이지 이동
	function logout() {
	   localStorage.removeItem("jwt_token");
	   isLoggedIn = false;
	   user = { name: '', picture: '' };
	   window.location.href = "/";
	}
 
	// ✅ 현재 재생 중인 트랙 정보
	let currentTrack = writable({
	   name: '',
	   artist: '',
	   albumImage: ''
	});
 
	// ✅ Svelte context에 currentTrack 등록 (하위 페이지에서 사용 가능)
	setContext('currentTrack', currentTrack);
 
	// ===== [추가된 부분] =====
	// 글로벌 가사 펼침 상태 스토어를 생성하고 context에 등록합니다.
	let lyricsExpanded = writable(false); // *** NEW: 글로벌 가사 펼침 상태 스토어 추가 ***
	setContext('lyricsExpanded', lyricsExpanded); // *** NEW: context에 등록 ***
	// ==========================
 
	// ✅ 프로그레스 바 관련 변수
	let currentTime = 0;
	let duration = 0;
	let progress = 0;
	let interval = null;
 
	// ✅ 시간 포맷 변환 (초 → mm:ss)
	function formatTime(seconds) {
	   const min = Math.floor(seconds / 60);
	   const sec = Math.floor(seconds % 60);
	   return `${min}:${sec < 10 ? '0' : ''}${sec}`;
	}
 
	 // 곡 상세페이지로 넘어가는 함수
	 function navigateToSongPage() {
	   const currentPath = get(page).url.pathname;
	   if (currentPath === '/song') {
		  goto('/search');
	   } else {
		  goto('/song');
	   }
	}
 
	// ✅ 전역 플레이어에서 곡 재생
	function handlePlayTrack(event) {
	   const { videoId, track, index } = event.detail;
 
	   if (videoId) {
		  currentTrack.update(t => ({
		 ...t, // 기존 값을 유지하면서 새 값으로 업데이트
		 name: track.name,
		 artist: track.artists.map((a) => a.name).join(', '),
		 albumImage: track.album.images[0]?.url || ''
	 }));
 
		  currentYouTubeVideoId = videoId;
		  currentTrackIndex = index; // ✅ 현재 재생 중인 트랙 인덱스 저장
 
		  if (!youtubePlayer) {
			 youtubePlayer = new YT.Player('youtube-player', {
				height: '0',
				width: '0',
				videoId: videoId,
				playerVars: {
				   autoplay: 1,
				   controls: 0,
				   showinfo: 0,
				   modestbranding: 1,
				   loop: 0,
				   rel: 0
				},
				events: {
				   onReady: () => {
					  youtubePlayer.playVideo();
					  startProgressUpdate();
				   },
				   onStateChange: (event) => {
					  console.log('🎬 YouTube 플레이어 상태 변경:', event.data);
 
					  if (event.data === YT.PlayerState.ENDED) {
						 console.log('✅ 곡이 끝남! 다음 곡 자동 재생 시작...');
						 playNextTrack();
					  } else if (event.data === YT.PlayerState.PLAYING) {
						 console.log('▶️ 곡 재생 중...');
						 startProgressUpdate();
					  } else if (event.data === YT.PlayerState.BUFFERING) {
						 console.log('⏳ 버퍼링 중...');
					  } else if (event.data === YT.PlayerState.PAUSED) {
						 console.log('⏸️ 곡 일시 정지됨');
					  } else {
						 console.log('⚠️ 알 수 없는 상태 코드:', event.data);
						 clearInterval(interval);
					  }
				   }
				}
			 });
		  } else {
			 youtubePlayer.loadVideoById(videoId);
			 startProgressUpdate();
		  }
		  isPlaying = true;
	   }
	}
 
	// ✅ 다음 곡 자동 재생 함수
	async function playNextTrack() {
	   console.log('⏭️ playNextTrack() 호출됨!');
 
	   const tracks = $searchResults;
	   console.log('🔍 현재 검색된 트랙 목록:', tracks);
	   console.log('🎵 현재 트랙 인덱스:', currentTrackIndex);
 
	   if (currentTrackIndex < tracks.length - 1) {
		  const nextTrack = tracks[currentTrackIndex + 1];
		  console.log('✅ 다음 재생할 트랙:', nextTrack);
 
		  // ✅ 기존의 playTrack() 함수를 호출하여 자동 재생
		  playTrack(nextTrack, currentTrackIndex + 1);
	   } else {
		  console.log('⏹️ 더 이상 재생할 트랙이 없습니다.');
	   }
	}
 
	// ✅ 현재 재생 시간을 업데이트하는 함수
	function startProgressUpdate() {
	   clearInterval(interval);
	   interval = setInterval(() => {
		  if (youtubePlayer && youtubePlayer.getCurrentTime) {
			 currentTime = youtubePlayer.getCurrentTime();
			 duration = youtubePlayer.getDuration();
			 progress = (currentTime / duration) * 100;
		  }
	   }, 500);
	}
 
	// ✅ 사용자가 슬라이더 이동 시 특정 위치로 이동
	function seekTrack(event) {
	   const newTime = (event.target.value / 100) * duration;
	   youtubePlayer.seekTo(newTime, true);
	}
 
	// ✅ 일시정지 / 재생 기능 유지
	function togglePause() {
	   if (youtubePlayer) {
		  if (isPlaying) {
			 youtubePlayer.pauseVideo();
		  } else {
			 youtubePlayer.playVideo();
		  }
		  isPlaying = !isPlaying;
	   }
	}
 
	// ✅ YouTube API 로드
	function loadYouTubeAPI() {
	   const script = document.createElement('script');
	   script.src = 'https://www.youtube.com/iframe_api';
	   script.async = true;
	   document.body.appendChild(script);
	}
 
	// ✅ 앱 시작: Spotify 토큰 체크 제거, YouTube API 로드, 이벤트 리스너 등록
	onMount(() => {
	   // URL 파라미터에 토큰이 있으면 처리
	   const urlParams = new URLSearchParams(window.location.search);
	   const tokenFromUrl = urlParams.get("token");
	   if (tokenFromUrl) {
		  localStorage.setItem("jwt_token", tokenFromUrl);
		  isLoggedIn = true;
		  try {
			 const decoded = jwt_decode(tokenFromUrl);
			 user.name = decoded.name;
			 user.picture = decoded.picture;
		  } catch (error) {
			 console.error("JWT 디코딩 오류:", error);
		  }
		  window.history.replaceState({}, document.title, "/");
	   } else {
		  const savedToken = localStorage.getItem("jwt_token");
		  if (savedToken) {
			 isLoggedIn = true;
			 try {
				const decoded = jwt_decode(savedToken);
				user.name = decoded.name;
				user.picture = decoded.picture;
			 } catch (error) {
				console.error("JWT 디코딩 오류:", error);
			 }
		  } else {
			 isLoggedIn = false;
		  }
	   }
	   console.log('🚀 앱 시작...');
	   loadYouTubeAPI();
	   window.addEventListener('playTrack', handlePlayTrack);
	});
 </script>
 
 <!-- 로그인/로그아웃 버튼과 사용자 정보는 오른쪽 상단에 고정 -->
 <div class="login-header" style="position: fixed; top: 0; right: 0; z-index: 1010; padding: 10px;">
	{#if isLoggedIn}
		<div class="user-info">
			 <img src={user.picture} alt="Profile Picture" style="width:40px; height:40px; border-radius:50%;" />
			 <span style="color: white; margin-left: 5px;">{user.name}</span>
			 <button on:click={logout} style="margin-left: 10px;">로그아웃</button>
		</div>
	{:else}
	<button on:click={() => window.location.href = `${backendUrl}/api/google/google-login?prompt=select_account`}>
	   구글 로그인
		</button>
	{/if}
 </div>
 
 <div class="layout">
	<div class="sidebar">
	   <h2><a href="/">It-Da</a></h2>
	   <nav>
		  <ul>
			 <li><a href="/about">About</a></li>
			 <li><a href="/hi">Hi</a></li>
			 <li><a href="/search">Search</a></li>
			 <li><a href="/song">Podcast</a></li>
		  </ul>
	   </nav>
	   <h3>Library</h3>
	   <ul>
		  <li><a href="/favorites">Favorites</a></li>
		  <li><a href="/playlist">Playlist</a></li>
	   </ul>
 
	   <div class="logo-container">
		  <img src="/logo2.png" alt="Logo" class="logo-image" />
	   </div>
	</div>
 
	<div class="main-content">
	   <h1>It Da!</h1>
	   <slot />
	</div>
 
	<!-- ✅ 전역 플레이어 -->
	<div class="player">
	   {#if $currentTrack.name}
	   <a href="/song" tabindex="0" role="button" on:click|preventDefault={navigateToSongPage}>
		  <img
			 src={$currentTrack?.albumImage || ''}
			 alt="Album Cover"
			 class="player-album-cover"
		  />
	   </a>         <div class="player-track-info">
			 <strong>{$currentTrack.name}</strong>
			 <p>{$currentTrack.artist}</p>
		  </div>
		  <!-- ✅ 현재 재생 시간 / 총 길이 표시 -->
		  <div class="wrap-time">
			 <div class="time-info">
				<button on:click={togglePause}>
				   {isPlaying ? '⏸️' : '▶️'}
				</button>
				<span>{formatTime(currentTime)}</span>
				<input
				   type="range"
				   min="0"
				   max="100"
				   step="0.1"
				   bind:value={progress}
				   on:input={seekTrack}
				   class="progress-bar"
				/>
				<span>{formatTime(duration)}</span>
			 </div>
		  </div>
	   {/if}
	</div>
 
	<div id="youtube-player"></div>
 </div>
 
 <style>
	:global(body) {
	   /* this will apply to <body> */
	   margin: 0;
	   padding: 0;
	}
 
	*::-webkit-scrollbar {
	   display: none;
	}
 
	* {
	   -ms-overflow-style: none;
	   scrollbar-width: none;
	}
	.layout {
	   display: flex;
	   height: 100vh;
	   overflow: hidden;
	   z-index: 1000;
	}
 
	.sidebar {
	   width: 250px;
	   background-color: white;
	   color: black;
	   text-decoration: none;
	   display: flex;
	   flex-direction: column;
	   gap: 20px;
	}
 
	.main-content h1 {
   position: sticky;
   top: 0;
   z-index: 2;           /* slot 콘텐츠보다 위에 표시 */
   background-color: black;  /* 배경색을 지정하여 아래 내용과 구분 */
   margin: 0;
   padding: 10px;
 }
 
 
	.sidebar h2,
	h3,
	nav {
	   padding-left: 20px;
	}
 
	/* .logo-image {
	   position: absolute;
	   bottom: 50px; 
	   width: 250px;
	} */
	
	.logo-container {
	width: 100%; /* ✅ 사이드바 크기에 맞게 설정 */
	display: flex;
	justify-content: center;
	align-items: center;
	margin-top: auto; /* ✅ 사이드바의 하단에 정렬 */
	gap: 20px;
	padding-bottom: 70px;
 }
 
 .logo-image {
	width: 100%; /* ✅ 사이드바 크기에 맞게 조절 */
	max-width: 200px; /* ✅ 최대 크기 제한 */
	object-fit: contain; /* ✅ 이미지 비율 유지 */
	transition: width 0.3s ease-in-out; /* ✅ 크기 변화 애니메이션 */
 }
 
	
 
	.sidebar:visited {
	   color: black;
	}
 
	.sidebar h2 a {
	   color: black;
	   text-decoration: none;
	   font-size: 40px;
	   transition: font-size 0.3s ease;
	}
 
	.sidebar h2 a:hover {
	   color: fuchsia;
	   font-size: 45px;
	}
 
	li {
	   list-style: none;
	}
	li a {
	   font-size: 25px;
	   color: black;
	   text-decoration: none;
	   transition: font-size 0.3s ease;
	}
 
	li a:hover {
	   color: deeppink;
	   font-size: 27px;
	}
 
	.main-content {
	   flex-grow: 1;
	   background-color: black;
	   color: white;
	   display: flex;
	   flex-direction: column;
	   overflow: auto;
	   padding-bottom: 70px;
	   position: relative;  /* 추가: main-content 내의 절대 위치 요소 기준 */
	   z-index: 1;
	}
 
	.player {
	   display: flex;
	   align-items: center;
	   justify-content: space-between;
	   position: fixed;
	   bottom: 0;
	   width: 100%;
	   height: 70px;
	   background-color: #222;
	   color: white;
	   display: flex;
	   padding: 0 40px 0 20px;
	   box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.2);
	   z-index: 100;
	}
 
	.player img {
	   width: 50px;
	   height: 50px;
	   border-radius: 5px;
	   margin-right: 10px;
	   box-shadow: 0 0 5px rgba(255, 255, 255, 0.6); /* ✅ 부드러운 흰색 박스 쉐도우 */
 
	}
 
	.player-track-info {
	   flex-grow: 1;
	   display: flex;
	   flex-direction: column;
	   max-width: 150px;
	}
 
	.player strong {
	   font-size: 14px;
	}
 
	.player p {
	   font-size: 12px;
	   color: #bbb;
	   margin: 0;
	}
 
	.player button {
	   background: none;
	   border: none;
	   color: white;
	   font-size: 40px;
	   cursor: pointer;
	}
 
	.player button:hover {
	   color: #1db954;
	}
 
	.wrap-time {
	   display: flex;
	   align-items: center;
	   gap: 8px;
	   font-size: 14px;
	   color: #bbb;
	   width: 90%;
	}
 
	.time-info {
	   display: flex;
	   align-items: center;
	   gap: 8px;
	   font-size: 14px;
	   color: #bbb;
	   width: 80%;
	}
 
	/* ✅ 프로그레스 바 스타일 */
	.progress-bar {
	   width: 80%;
	   margin: 0 10px;
	   appearance: none;
	   background: #555;
	   height: 5px;
	   border-radius: 5px;
	   cursor: pointer;
	}
 
	.progress-bar::-webkit-slider-thumb {
	   appearance: none;
	   background: #1db954;
	   width: 10px;
	   height: 10px;
	   border-radius: 50%;
	   cursor: pointer;
	}
 </style>
 