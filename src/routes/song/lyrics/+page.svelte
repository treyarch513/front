<!-- /bruavo-front/src/routes/song/lyrics/+page.svelte -->
<script>
	import { getContext, onMount, tick } from 'svelte';
	import { writable } from 'svelte/store';

	const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

	// +layout.svelte에서 공유한 currentTrack 가져오기
	let currentTrack = getContext('currentTrack');

	// 추가 상태 변수: 보정 진행 여부 02.13 추가
	let refining = false;


	// ===== [변경된 부분] =====
	// +layout.svelte에서 전달한 글로벌 가사 펼침 상태 스토어를 가져옵니다.
	let showLyrics = getContext('lyricsExpanded'); // *** CHANGED: 로컬 스토어 대신 getContext 사용 ***
	// NEW: 전역 currentTime 스토어 가져오기
	let currentTimeStore = getContext('currentTime'); /* NEW: 전역 currentTimeStore 가져오기 */
	let currentTimeVal = 0;
	currentTimeStore.subscribe(value => {
		currentTimeVal = value;
	});
	// ==========================

	// 가사 상태 변수: 원본과 번역본
	let lyrics = "가사를 불러오는 중...";
	let translatedLyrics = ""; // 번역본은 버튼 클릭 시 요청
	let isTranslating = false;

	// NEW: 파싱된 가사 (타임스탬프 포함)가 있다면 저장
	let parsedLyrics = null; /* NEW: 백엔드에서 전달받은 타임스탬프 데이터 저장 */

	// 기존 캐싱 키 변수 그대로 사용
	$: trackKey = $currentTrack && $currentTrack.name ? `${$currentTrack.name}-${$currentTrack.artist}` : "";

	// 원본 및 번역 가사를 줄 단위 배열로 분리 (빈 줄 제거)
	$: originalLines = lyrics.split('\n').filter(line => line.trim() !== '');
	$: translatedLines = translatedLyrics.split('\n').filter(line => line.trim() !== '');

	// NEW: 헬퍼 함수 - "mm:ss.xx" 형식을 초 단위 숫자로 변환
	function convertTimeToSeconds(timeStr) {
		const parts = timeStr.split(':');
		if (parts.length === 2) {
			return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
		}
		return 0;
	}

	// NEW: 현재 재생시간에 따른 활성화된 가사 라인 인덱스 계산
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

  // 최신 NEW: 하이라이트된 가사가 화면 중앙으로 자동 스크롤되도록 처리
	$: if (activeLineIndex !== -1) {
		// tick()을 사용해 DOM 업데이트가 완료된 후 실행
		tick().then(() => {
			// lyricsContainer 내부에서 하이라이트 클래스를 가진 첫 번째 요소 선택
			const highlightedEl = lyricsContainer.querySelector('.lyrics-content.highlight');
			if (highlightedEl) {
				// 부드럽게 중앙 정렬되도록 스크롤 처리
				highlightedEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
		});
	}
	// ==========================

	// 가사를 API로부터 가져오는 함수
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
					'Content-Type': 'application/json', // ✅ JSON 요청
					'ngrok-skip-browser-warning': '69420' // ✅ ngrok 보안 경고 우회
				}
			});
			const data = await res.json();
			if (data.lyrics) {
				lyrics = data.lyrics;
				/* NEW: 백엔드에서 타임스탬프 배열(parsedLyrics)이 전달되면 저장 */
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

	async function requestTranslation() {
		if (translatedLyrics) {
			// 이미 번역이 있다면 토글: 다시 원문만 표시
			translatedLyrics = "";
			sessionStorage.removeItem(`translated-${trackKey}`);
			return;
		}
		if (lyrics) {
			isTranslating = true;
			try {
				const response = await fetch(`${backendUrl}/api/translate`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'ngrok-skip-browser-warning': '69420'
					},
					body: JSON.stringify({ lyrics })
				});
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
								// Papago 번역 결과는 그대로 유지
								translatedLyrics = data.translation;
								sessionStorage.setItem(`translated-${trackKey}`, translatedLyrics);
							} else if (data.stage === "update") {
								// 보정 진행 상태를 별도로 표시 (Papago 번역은 그대로 유지)
								refining = true;
							} else if (data.stage === "refined") {
								// 최종 보정 결과가 도착하면 번역 결과 교체
								translatedLyrics = data.translation;
								refining = false;
								sessionStorage.setItem(`translated-${trackKey}`, translatedLyrics);
							} else if (data.stage === "error") {
								translatedLyrics = data.message;
							}
							await tick();
						}
					}
				}
			} catch (error) {
				console.error("번역 요청 오류:", error);
				translatedLyrics = "번역 요청 실패";
			} finally {
				isTranslating = false;
			}
		}
	}


	// currentTrack 스토어 구독: 곡 정보가 있을 경우 가사를 요청합니다.
	const unsubscribe = currentTrack.subscribe(track => {
		if (track && track.name && track.artist) {
			fetchLyrics(track.name, track.artist);
			// 캐싱된 번역본이 있다면 불러옵니다.
			const cachedTranslated = sessionStorage.getItem(`translated-${track.name}-${track.artist}`);
			if (cachedTranslated) {
				translatedLyrics = cachedTranslated;
			}
		}
	});

	function updateParagraphOpacity() {
		// lyricsContainer 안의 모든 .lyrics-content 요소 선택
		const paragraphs = lyricsContainer.querySelectorAll('.lyrics-content');
		paragraphs.forEach(p => {
			const rect = p.getBoundingClientRect();
			let opacity;
			if (rect.top <= fadeStart) {
				opacity = 0;
			} else if (rect.top >= fadeEnd) {
				opacity = 1;
			} else {
				// fadeStart와 fadeEnd 사이이면 선형 보간으로 opacity 계산
				opacity = (rect.top - fadeStart) / (fadeEnd - fadeStart);
			}
			// 계산된 opacity 값을 inline 스타일로 적용
			p.style.opacity = opacity;
		});
	}

	let lyricsContainer;
	// fade 효과 범위 설정
	const fadeStart = 200;
	const fadeEnd = 500;

	onMount(() => {
		// 실제 스크롤이 발생하는 부모 컨테이너 (.song-page)를 선택
		const songPage = document.querySelector('.song-page');
		if (songPage) {
			songPage.addEventListener('scroll', updateParagraphOpacity);
		}
		// 페이지 로드시 한 번 초기 업데이트
		updateParagraphOpacity();
		return () => {
			if (songPage) {
				songPage.removeEventListener('scroll', updateParagraphOpacity);
			}
		};
	});
</script>

<div class="lyrics-container" bind:this={lyricsContainer}>
	{#if parsedLyrics}
		{#each parsedLyrics as line, i}
			<div class="line-pair">
				<!-- NEW: 현재 재생시간에 따른 하이라이트 클래스 "highlight" 추가 -->
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
	<!-- 보정 진행 상태 표시 (오버레이나 별도 요소로) -->
	{#if refining}
		<div class="refining-indicator">번역 보정 진행중...</div>
	{/if}

	<button on:click={requestTranslation} class="translate-button" disabled={isTranslating}>
		{#if isTranslating}
			번역 중...
		{:else}
			번역 요청
		{/if}
	</button>
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
    transition: opacity 0.3s ease; /* opacity 변화가 부드럽게 전환됩니다 */
  }

  .line-pair {
    margin-bottom: 1px;  /* 각 쌍 사이의 간격을 넓게 */
  }
  /* 원문과 번역본은 같은 쌍 내에서 간격을 좁게 */
  .line-pair .original {
    margin-bottom: 2px;
  }

  .translated-lyrics {
  text-decoration: underline;
  text-decoration-color: #17a44d;
  text-decoration-thickness: 2px; /* 밑줄 두께 조절 */
}
  .translate-button {
    margin-top: 20px;
    padding: 10px 20px;
    font-size: 18px;
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

  .refining-indicator {
		margin-top: 10px;
		font-size: 16px;
		color: #ffc107;
	}
</style> 