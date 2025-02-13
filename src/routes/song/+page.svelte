<!-- /bravo-front/src/routes/song/+page.svelte -->

<script>
	import { getContext, onMount, tick } from 'svelte';
	import { writable } from 'svelte/store';
	import Lyrics from './lyrics/+page.svelte';

	const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';


	// +layout.svelte에서 공유한 currentTrack 가져오기
	let currentTrack = getContext('currentTrack');

// 기존: let showLyrics = writable(false); // 로컬 상태였음  
	// ===== [변경된 부분] =====
	// +layout.svelte에서 전달한 글로벌 가사 펼침 상태 스토어를 가져옵니다.
	let showLyrics = getContext('lyricsExpanded'); // *** CHANGED: 로컬 스토어 대신 getContext 사용 ***
	// ==========================

	// 가사 보이기 여부 store
	function toggleLyrics() {
		showLyrics.update(n => !n);
	}

	// 배경 이미지 상태 관리
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

	// 헤더(곡 정보) 스크롤 효과를 위한 상태
	let headerScale = writable(1);
	let headerTranslateY = writable(0);
	const maxScroll = 150; // 최대 스크롤 임계값

	// Song 페이지 컨테이너 참조 (스크롤 이벤트 대상)
	let songPage;
	let headerContainer;


	function handleScroll() {
		const scrollTop = songPage ? songPage.scrollTop : 0;
		if (scrollTop < maxScroll) {
			const scale = 1 - (scrollTop / maxScroll) * 0.3; // 1 ~ 0.7
			headerScale.set(scale);
			headerTranslateY.set(-scrollTop);
		} else {
			headerScale.set(0.5);
			headerTranslateY.set(-maxScroll);
		}
	}

	onMount(() => {
		// 컨테이너에 스크롤 이벤트 부착
		if (songPage) {
			songPage.addEventListener('scroll', handleScroll);
		}
		return () => {
			if (songPage) songPage.removeEventListener('scroll', handleScroll);
		};
	});
</script>

<!-- Song 페이지 컨테이너: 가사가 펼쳐지면 height는 auto, 그렇지 않으면 100vh -->
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

	<!-- 헤더 컨테이너 부분 -->
<div 
class="header-container"
bind:this={headerContainer}
style="transform: scale({$headerScale}) translateY({$headerTranslateY}px);"
>
<img src={$currentTrack.albumImage} alt="Album Cover" class="song-image" />
<h1 class="song-title">{$currentTrack.name}</h1>
<p class="song-artist">{$currentTrack.artist}</p>
<button class="lyrics-toggle" on:click={toggleLyrics}>
  {#if $showLyrics}
    ▲ 가사 접기
  {:else}
    ▼ 가사 보기
  {/if}
</button>
</div>


	<!-- 가사 토글 버튼 -->
	

	<!-- 가사 컴포넌트 -->
	<div class="lyrics-wrapper { $showLyrics ? 'show' : '' }">
		<Lyrics />
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

	/* Song 페이지 컨테이너 (내용 영역) */
	.song-page {
		position: relative;
		padding: 20px 0 60px;
		color: white;
		text-align: center;
		z-index: 0;
		box-sizing: border-box;
	}

	/* 배경 이미지 요소 – 메인 콘텐츠 영역(사이드바 너비 250px 제외)을 덮음 */
	.background-image {
		position: fixed;
		top: 0;
		left: 250px; /* 사이드바 영역(250px) 제외 */
		width: calc(100% - 250px);
		height: 100vh;
		background-size: cover;
		background-position: center;
		background-repeat: no-repeat;
		transition: opacity 1s ease-in-out;
		z-index: -100;
	}

	/* 어두운 오버레이 – 배경과 동일 영역 */
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

	/* 헤더 컨테이너 */
	.header-container {
  position: sticky;
  top: 60px;
  z-index: 10;
  padding: 20px;
  transition: transform 0.2s ease-out;
  transform-origin: top center;  /* 추가: 상단 중앙을 기준으로 scaling */
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

	/* 가사 토글 버튼 */
	.lyrics-toggle {
		margin-top: 20px;
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

	/* 가사 컨테이너 – 기본 상태 (숨김) */
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

	/* 가사가 보일 때 */
	.lyrics-wrapper.show {
		opacity: 1;
		max-height: fit-content;
		margin: 20px auto 0;
		padding: 20px;
		text-align: center;
	}
</style>