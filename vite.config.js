import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import babel from "@rolldown/plugin-babel";

// https://vite.dev/config/
export default defineConfig({
    plugins: [basicSsl(), react(), babel({ presets: [reactCompilerPreset()] })],
    server: {
        https: true,
        proxy: {
            "/api": {
                target: "http://localhost:4000",
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/api/, ""),
            },
            "/qlik": {
                target: "http://localhost:4848",
                changeOrigin: true,
                secure: false,
                ws: true,
                rewrite: (path) => path.replace(/^\/qlik/, ""),
            },
        },
    },
});
