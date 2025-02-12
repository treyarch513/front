import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		// 여기에 ngrok 호스트를 추가합니다.
		host: true,
      port: 5174,
		proxy: {
			'/api': {
				target: 'http://localhost:3001',
				changeOrigin: true,
				rewrite: (path) => path // 필요한 경우 rewrite 옵션 추가
			}
		},

		allowedHosts: ['fair-readily-viper.ngrok-free.app']
	}
});
