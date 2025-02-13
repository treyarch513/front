<script>
	import { getContext, onMount, tick, createEventDispatcher } from 'svelte';
	import { writable } from 'svelte/store';
	const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
	let currentTrack = getContext('currentTrack');
	let showLyrics = getContext('lyricsExpanded');
	let currentTimeStore = getContext('currentTime');
	let currentTimeVal = 0;
	currentTimeStore.subscribe(value => {
	  currentTimeVal = value;
	});
	
	let lyrics = "가사를 불러오는 중...";
	let translatedLyrics = "";
	let isTranslating = false;
	let refining = false;
	let parsedLyrics = null;
	
	$: trackKey = $currentTrack && $currentTrack.name ? `${$currentTrack.name}-${$currentTrack.artist}` : "";
	$: originalLines = lyrics.split('\n').filter(line => line.trim() !== '');
	$: translatedLines = translatedLyrics.split('\n').filter(line => line.trim() !== '');
	
	function convertTimeToSeconds(timeStr) {
	  const parts = timeStr.split(':');
	  if (parts.length === 2) {
		return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
	  }
	  return 0;
	}
	
	let activeLineIndex = -1;
	$: if (parsedLyrics) {
	  activeLineIndex = -1;
	  for (let i = 0; i < parsedLyrics.length; i++) {
		const lineTime = convertTimeToSeconds(parsedLyrics[i].time);
		if (currentTimeVal >= lineTime) {
		  activeLineIndex = i;
		} else {
		  break;
		}
	  }
	}
	
	$: if (activeLineIndex !== -1) {
	  tick().then(() => {
		const highlightedEl = lyricsContainer.querySelector('.lyrics-content.highlight');
		if (highlightedEl) {
		  highlightedEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
	  });
	}
	
	async function fetchLyrics(song, artist) {
	  const cacheKey = `lyrics-${song}-${artist}`;
	  const cached = sessionStorage.getItem(cacheKey);
	  if (cached) {
		lyrics = cached;
		return;
	  }
	  try {
		const res = await fetch(`${backendUrl}/api/lyrics?song=${encodeURIComponent(song)}&artist=${encodeURIComponent(artist)}`,
		{
		  headers: {
			'Content-Type': 'application/json',
			'ngrok-skip-browser-warning': '69420'
		  }
		});
		const data = await res.json();
		if (data.lyrics) {
		  lyrics = data.lyrics;
		  if (data.parsedLyrics) {
			parsedLyrics = data.parsedLyrics;
		  }
		  sessionStorage.setItem(cacheKey, lyrics);
		} else {
		  lyrics = "가사를 찾을 수 없습니다.";
		}
	  } catch (error) {
		console.error("가사 가져오기 오류:", error);
		lyrics = "가사를 불러오는데 실패했습니다.";
	  }
	}
	
	const dispatch = createEventDispatcher();
	
	async function requestTranslation() {
	  if (translatedLyrics) {
		translatedLyrics = "";
		sessionStorage.removeItem(`translated-${trackKey}`);
		// 상태 변화 이벤트 디스패치
		dispatch('update', { isTranslating, refining });
		return;
	  }
	  if (lyrics) {
		isTranslating = true;
		dispatch('update', { isTranslating, refining });
		try {
		  const response = await fetch(
			`${backendUrl}/api/translate`,
			{
			  method: 'POST',
			  headers: {
				'Content-Type': 'application/json',
				'ngrok-skip-browser-warning': '69420'
			  },
			  body: JSON.stringify({ lyrics })
			}
		  );
		  const reader = response.body.getReader();
		  const decoder = new TextDecoder();
		  let done = false;
		  while (!done) {
			const { value, done: doneReading } = await reader.read();
			done = doneReading;
			const chunk = decoder.decode(value);
			const lines = chunk.split("\n").filter(line => line.trim() !== "");
			for (const line of lines) {
			  if (line.startsWith("data: ")) {
				const jsonStr = line.slice(6);
				const data = JSON.parse(jsonStr);
				if (data.stage === "papago") {
				  translatedLyrics = data.translation;
				  sessionStorage.setItem(`translated-${trackKey}`, translatedLyrics);
				} else if (data.stage === "update") {
				  refining = true;
				} else if (data.stage === "refined") {
				  translatedLyrics = data.translation;
				  refining = false;
				  sessionStorage.setItem(`translated-${trackKey}`, translatedLyrics);
				} else if (data.stage === "error") {
				  translatedLyrics = data.message;
				}
				dispatch('update', { isTranslating, refining });
				await tick();
			  }
			}
		  }
		} catch (error) {
		  console.error("번역 요청 오류:", error);
		  translatedLyrics = "번역 요청 실패";
		} finally {
		  isTranslating = false;
		  dispatch('update', { isTranslating, refining });
		}
	  }
	}
	
	const unsubscribe = currentTrack.subscribe(track => {
	  if (track && track.name && track.artist) {
		fetchLyrics(track.name, track.artist);
		const cachedTranslated = sessionStorage.getItem(`translated-${track.name}-${track.artist}`);
		if (cachedTranslated) {
		  translatedLyrics = cachedTranslated;
		}
	  }
	});
	
	function updateParagraphOpacity() {
	  const paragraphs = lyricsContainer.querySelectorAll('.lyrics-content');
	  paragraphs.forEach(p => {
		const rect = p.getBoundingClientRect();
		let opacity;
		if (rect.top <= fadeStart) {
		  opacity = 0;
		} else if (rect.top >= fadeEnd) {
		  opacity = 1;
		} else {
		  opacity = (rect.top - fadeStart) / (fadeEnd - fadeStart);
		}
		p.style.opacity = opacity;
	  });
	}
	
	let lyricsContainer;
	const fadeStart = 300;
	const fadeEnd = 500;
	
	onMount(() => {
	  const songPage = document.querySelector('.song-page');
	  if (songPage) {
		songPage.addEventListener('scroll', updateParagraphOpacity);
	  }
	  updateParagraphOpacity();
	  return () => {
		if (songPage) {
		  songPage.removeEventListener('scroll', updateParagraphOpacity);
		}
	  };
	});
	
	// 기존 export 대신 이벤트로 상태를 부모에게 알림
	export { requestTranslation };
  </script>
  
  <div class="lyrics-container" bind:this={lyricsContainer}>
	{#if parsedLyrics}
	  {#each parsedLyrics as line, i}
		<div class="line-pair">
		  <p class="lyrics-content original {i === activeLineIndex ? 'highlight' : ''}">
			{line.text}
		  </p>
		  {#if translatedLines[i]}
			<p class="lyrics-content translated-lyrics {i === activeLineIndex ? 'highlight' : ''}">
			  {translatedLines[i]}
			</p>
		  {/if}
		</div>
	  {/each}
	{:else}
	  {#if originalLines.length > 0}
		{#each originalLines as line, i}
		  <div class="line-pair">
			<p class="lyrics-content original">{line}</p>
			{#if translatedLines[i]}
			  <p class="lyrics-content translated-lyrics">{translatedLines[i]}</p>
			{/if}
		  </div>
		{/each}
	  {:else}
		<p class="lyrics-content">{lyrics}</p>
	  {/if}
	{/if}
	<!-- 기존 번역 버튼과 인디케이터는 삭제 (부모로 옮겼음) -->
  </div>
  
  <style>
	.highlight {
	  color: #1db954;
	  font-weight: bold;
	}
	.lyrics-container {
	  width: 100%;
	  max-width: 900px;
	  padding: 20px;
	  border-radius: 10px;
	  margin: 20px auto 0;
	  color: white;
	  display: flex;
	  flex-direction: column;
	  justify-content: center;
	  align-items: center;
	  text-align: center;
	}
	.lyrics-content {
	  white-space: pre-line;
	  font-size: 20px;
	  transition: opacity 0.3s ease;
	}
	.line-pair {
	  margin-bottom: 1px;
	}
	.line-pair .original {
	  margin-bottom: 2px;
	}
	.translated-lyrics {
	  text-decoration: underline;
	  text-decoration-color: #17a44d;
	  text-decoration-thickness: 2px;
	}
  </style>
  