<script>
	import { getContext, onMount, tick } from 'svelte';
	import { writable } from 'svelte/store';
	import Lyrics from './lyrics/+page.svelte';
  
	const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
	let currentTrack = getContext('currentTrack');
	let showLyrics = getContext('lyricsExpanded');
	
	function toggleLyrics() {
	  showLyrics.update(n => !n);
	}
	
	let isBackgroundLoaded = writable(true);
	let backgroundImage = writable($currentTrack.albumImage);
	let previousBackgroundImage = writable($currentTrack.albumImage);
  
	$: {
	  if ($currentTrack.albumImage && $backgroundImage !== $currentTrack.albumImage) {
		fadeBackground();
	  }
	}
	async function fadeBackground() {
	  isBackgroundLoaded.set(false);
	  previousBackgroundImage.set($backgroundImage);
	  await tick();
	  setTimeout(() => {
		backgroundImage.set($currentTrack.albumImage);
		isBackgroundLoaded.set(true);
	  }, 300);
	}
  
	let headerScale = writable(1);
	let headerTranslateY = writable(0);
	const maxScroll = 150;
	let songPage;
	let headerContainer;
	let lyricsComponent;
  
	// 부모에서 자식의 상태를 관리할 로컬 변수들
	let childIsTranslating = false;
	let childRefining = false;
  
	function handleUpdate(event) {
	  // 자식 컴포넌트에서 보내는 상태 업데이트 이벤트 수신
	  childIsTranslating = event.detail.isTranslating;
	  childRefining = event.detail.refining;
	}
  
	function handleScroll() {
	  const scrollTop = songPage ? songPage.scrollTop : 0;
	  if (scrollTop < maxScroll) {
		const scale = 1 - (scrollTop / maxScroll) * 0.3;
		headerScale.set(scale);
		headerTranslateY.set(-scrollTop);
	  } else {
		headerScale.set(0.5);
		headerTranslateY.set(-maxScroll);
	  }
	}
  
	onMount(() => {
	  if (songPage) {
		songPage.addEventListener('scroll', handleScroll);
	  }
	  return () => {
		if (songPage) songPage.removeEventListener('scroll', handleScroll);
	  };
	});
  </script>
  
  <!-- Song 페이지 컨테이너 -->
  <div 
	class="song-page" 
	bind:this={songPage}
	style="height: {$showLyrics ? 'auto' : '100vh'}; overflow: {$showLyrics ? 'auto' : 'hidden'};"
  >
	<!-- 배경 이미지 (페이드 아웃) -->
	<div
	  class="background-image previous"
	  style="background-image: url({$previousBackgroundImage}); opacity: {$isBackgroundLoaded ? 0 : 1};"
	></div>
	<!-- 배경 이미지 (페이드 인) -->
	<div
	  class="background-image"
	  style="background-image: url({$backgroundImage}); opacity: {$isBackgroundLoaded ? 1 : 0};"
	></div>
  
	<!-- 헤더 컨테이너 -->
	<div 
	  class="header-container"
	  bind:this={headerContainer}
	  style="transform: scale({$headerScale}) translateY({$headerTranslateY}px);"
	>
	  <img src={$currentTrack.albumImage} alt="Album Cover" class="song-image" />
	  <h1 class="song-title">{$currentTrack.name}</h1>
	  <p class="song-artist">{$currentTrack.artist}</p>
	  
	  <!-- ===== [변경된 부분] =====
		   버튼들을 그룹으로 묶고, 번역 인디케이터는 버튼 그룹 아래에 위치하도록 함
	  -->
	  <div class="button-group">
		<button class="lyrics-toggle" on:click={toggleLyrics}>
		  {#if $showLyrics}
			▲ 가사 접기
		  {:else}
			▼ 가사 보기
		  {/if}
		</button>
		<button on:click={() => lyricsComponent.requestTranslation()} class="translate-button" disabled={childIsTranslating}>
		  {#if childIsTranslating}
			번역 중...
		  {:else}
			번역 요청
		  {/if}
		</button>
	  </div>
	  {#if childRefining}
		<div class="indicator-container">
		  <span class="refining-indicator">번역 보정 진행중...</span>
		</div>
	  {/if}
	  <!-- ===== [변경된 부분 끝] ===== -->
	  
	</div>
  
	<!-- 가사 컴포넌트 -->
	<div class="lyrics-wrapper { $showLyrics ? 'show' : '' }">
	  <Lyrics bind:this={lyricsComponent} on:update={handleUpdate} />
	</div>
  </div>
  
  <style>
	*::-webkit-scrollbar {
	  display: none;
	}
	* {
	  -ms-overflow-style: none;
	  scrollbar-width: none;
	}
	.song-page {
	  position: relative;
	  padding: 20px 0 60px;
	  color: white;
	  text-align: center;
	  z-index: 0;
	  box-sizing: border-box;
	}
	.background-image {
	  position: fixed;
	  top: 0;
	  left: 250px;
	  width: calc(100% - 250px);
	  height: 100vh;
	  background-size: cover;
	  background-position: center;
	  background-repeat: no-repeat;
	  transition: opacity 1s ease-in-out;
	  z-index: -100;
	}
	.song-page::before {
	  content: "";
	  position: fixed;
	  top: 0;
	  left: 250px;
	  width: calc(100% - 250px);
	  height: 100vh;
	  background: rgba(0, 0, 0, 0.5);
	  z-index: -50;
	}
	.header-container {
	  position: sticky;
	  top: 60px;
	  z-index: 10;
	  padding: 20px;
	  transition: transform 0.2s ease-out;
	  transform-origin: top center;
	}
	.song-image {
	  width: 30%;
	  max-width: 400px;
	  border-radius: 10px;
	  margin-bottom: 10px;
	  box-shadow: 0 0 20px rgba(255, 255, 255, 0.6);
	}
	.song-title {
	  font-size: 40px;
	  font-weight: bold;
	  margin: 0;
	}
	.song-artist {
	  font-size: 24px;
	  color: #bbb;
	  margin: 0;
	}
	/* --- 변경된 부분: 버튼 그룹 및 인디케이터 컨테이너 스타일 --- */
	.button-group {
	  display: inline-flex;
	  gap: 10px;
	  margin-top: 10px;
	}
	.lyrics-toggle {
	  background: #1db954;
	  color: white;
	  border: none;
	  padding: 12px 20px;
	  font-size: 16px;
	  border-radius: 5px;
	  cursor: pointer;
	  transition: background 0.3s;
	  position: relative;
	  z-index: 10;
	}
	.lyrics-toggle:hover {
	  background: #1a954b;
	}
	.translate-button {
	  padding: 12px 20px;
	  font-size: 16px;
	  border: none;
	  border-radius: 5px;
	  cursor: pointer;
	  background-color: #1db954;
	  color: white;
	  transition: background-color 0.3s;
	}
	.translate-button:hover {
	  background-color: #17a44d;
	}
	.indicator-container {
	  margin-top: 5px;
	}
	.refining-indicator {
	  font-size: 25px;
	  color: #ffc107;
	}
	/* ----------------------------------------------------------------- */
	.lyrics-wrapper {
	  width: 80%;
	  margin: 0 auto;
	  padding: 0;
	  color: white;
	  border-radius: 10px;
	  text-align: center;
	  opacity: 0;
	  max-height: 0;
	  overflow: hidden;
	  transition: max-height 0.5s ease-in-out,
				  opacity 0.5s ease-in-out,
				  padding 0.5s ease-in-out,
				  margin 0.5s ease-in-out;
	  position: relative;
	  z-index: 5;
	}
	.lyrics-wrapper.show {
	  opacity: 1;
	  max-height: fit-content;
	  margin: 20px auto 0;
	  padding: 20px;
	  text-align: center;
	}
  </style>
  