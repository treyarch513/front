<script>
    import { onMount } from 'svelte';
    import { playlistManager } from '$lib/playlistManagerStore.js';
    
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
  
    onMount(async () => {
      try {
        const user_id = "로그인된사용자아이디"; // 로그인 시 받아온 user_id 대입
        const res = await fetch(`${backendUrl}/api/playlist?user_id=${user_id}`);
        if (!res.ok) {
          throw new Error("플레이리스트 조회 실패");
        }
        const playlists = await res.json();
        playlistManager.set(playlists);
      } catch (error) {
        console.error(error);
      }
    });
  </script>
  
  {#if $playlistManager.length > 0}
    <ul>
      {#each $playlistManager as playlist}
        <li>{playlist.name}</li>
      {/each}
    </ul>
  {:else}
    <p>등록된 플레이리스트가 없습니다.</p>
  {/if}