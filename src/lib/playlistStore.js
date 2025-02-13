import { writable } from 'svelte/store';

// 플레이리스트 기본 값: 빈 배열
export const playlist = writable([]); 