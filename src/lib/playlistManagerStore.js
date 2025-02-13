import { writable } from 'svelte/store';

export const playlistManager = writable([]);
// 각 플레이리스트 객체의 형식: { id: number, name: string, tracks: [] }
