export async function getLyrics(trackName, artistName) {
    try {
        console.log(`🎵 [프론트엔드] 가사 요청: ${trackName} - ${artistName}`);

        const encodedTrack = encodeURIComponent(trackName);
        const encodedArtist = encodeURIComponent(artistName);
        const apiUrl = `http://localhost:3001/api/lyrics?song=${encodedTrack}&artist=${encodedArtist}`;

        console.log(`🔍 API 요청 URL: ${apiUrl}`); // ✅ 요청 URL 확인 로그 추가

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            mode: 'cors'  // ✅ CORS 문제 방지
        });

        console.log("📢 [프론트엔드] API 응답 상태 코드:", response.status);
        const data = await response.json();
        
        console.log("📢 [프론트엔드] API 응답 데이터:", data);

        if (data.error) {
            console.error("❌ [프론트엔드] 가사 조회 오류:", data.error);
            return null;
        }

        return data.lyrics;
    } catch (error) {
        console.error("❌ [프론트엔드] API 호출 실패:", error);
        return null;
    }
}
