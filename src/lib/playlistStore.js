import { writable } from 'svelte/store';

// 플레이리스트에 담길 트랙 객체 배열을 관리하는 writable 스토어
export const playlist = writable([]);

// 예시: 특정 트랙을 플레이리스트에 추가하는 함수
export function addTrackToPlaylist(track) {
  playlist.update(tracks => {
    return [...tracks, track];
  });
}

/*
  트랙 객체 예시:
  {
    name: "트랙 제목",
    artist: "아티스트 이름",
    albumImage: "앨범 이미지 URL",
    videoId: "유튜브 비디오 아이디" // 선택사항
  }
*/

// 트랙 ID를 DB에 저장하는 함수 (예시)
export function saveTrackToDB(trackId) {
  fetch(`${import.meta.env.VITE_BACKEND_URL}/api/playlist`, { // 백엔드에 맞게 API 엔드포인트를 조정하세요
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ trackId })
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('트랙 저장에 실패하였습니다.');
      }
      return response.json();
    })
    .then(data => console.log('트랙 저장 성공:', data))
    .catch(error => console.error('트랙 저장 중 에러 발생:', error));
}