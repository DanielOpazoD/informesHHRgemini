import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
        server: {
            port: 3000,
            host: '0.0.0.0',
        },
        plugins: [react()],
        define: {
            'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
            'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        },
        // Allow using either the recommended VITE_* variables or the legacy
        // GEMINI_* ones directly from import.meta.env.
        envPrefix: ['VITE_', 'GEMINI_'],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, '.'),
            },
        },
    };
});
