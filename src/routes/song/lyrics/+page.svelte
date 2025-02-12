<!-- /bruavo-front/src/routes/song/lyrics/+page.svelte -->
<script>
  import { getContext, onMount } from 'svelte';
  let currentTrack = getContext('currentTrack');

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';


  // lyricsContainer: 이 컨테이너 내에 있는 p 태그에 fade 효과를 적용합니다.
  let lyricsContainer;

  // fade 효과 범위 설정 (예: 상단 0px ~ 800px 사이에서 선형 보간)
  const fadeStart = 200;
  const fadeEnd = 500;

  // 가사 상태 변수: 원본과 번역본
  let lyrics = "가사를 불러오는 중...";
  let translatedLyrics = ""; // 번역본은 버튼 클릭 시 요청
  let isTranslating = false;

// 현재 트랙 키 (곡명-아티스트 조합) -> 캐싱 키로 사용
$: trackKey = $currentTrack && $currentTrack.name ? `${$currentTrack.name}-${$currentTrack.artist}` : "";

// 원본 및 번역 가사를 줄 단위 배열로 분리 (빈 줄 제거)
$: originalLines = lyrics.split('\n').filter(line => line.trim() !== '');
$: translatedLines = translatedLyrics.split('\n').filter(line => line.trim() !== '');

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
        sessionStorage.setItem(cacheKey, lyrics);
      } else {
        lyrics = "가사를 찾을 수 없습니다.";
      }
    } catch (error) {
      console.error("가사 가져오기 오류:", error);
      lyrics = "가사를 불러오는데 실패했습니다.";
    }
  }

  // 번역 요청 함수 (추가: 번역 토글 기능 구현)
  async function requestTranslation() {
    // 만약 이미 번역본이 있다면, 버튼을 다시 누르면 번역본을 지워 원문만 보이도록 토글
    if (translatedLyrics) {
      translatedLyrics = "";
      sessionStorage.removeItem(`translated-${trackKey}`);
      return;
    }
    if (lyrics) {
      isTranslating = true;
      try {
        const response = await fetch(
          `${backendUrl}/api/translate`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'ngrok-skip-browser-warning': '69420' // ✅ ngrok 보안 경고 우회
            },
            body: JSON.stringify({ lyrics })
          }
        );
        const data = await response.json();
        if (data.translatedLyrics) {
          translatedLyrics = data.translatedLyrics;
          sessionStorage.setItem(`translated-${trackKey}`, translatedLyrics);
        } else {
          translatedLyrics = "번역 결과를 가져오지 못했습니다.";
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
      // (디버깅용) 콘솔에 각 p 태그의 위치와 opacity 출력
      // console.log('p rect.top:', rect.top, '=> opacity:', opacity);
    });
  }

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
  <div class="lyrics-container" bind:this={lyricsContainer}>
    {#if originalLines.length > 0}
      {#each originalLines as line, i}
        <!-- 각 원문-번역본 쌍을 line-pair 컨테이너로 묶습니다 -->
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
    <button on:click={requestTranslation} class="translate-button" disabled={isTranslating}>
      {#if isTranslating}
        번역 중...
      {:else}
        번역 요청
      {/if}
    </button>
  </div>
</div>

<style>
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
    margin-bottom: 8px;  /* 각 쌍 사이의 간격을 넓게 */
  }
  /* 원문과 번역본은 같은 쌍 내에서 간격을 좁게 */
  .line-pair .original {
    margin-bottom: 2px;
  }

  .translated-lyrics {
  color: #17a44d; /* 번역본 가사는 연한 주황색으로 표시 */
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
</style>
