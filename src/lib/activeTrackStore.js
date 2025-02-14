import { writable } from 'svelte/store';
   
// activeTrack은 현재 재생 중인 트랙 정보를 저장합니다.
export const activeTrack = writable(null);