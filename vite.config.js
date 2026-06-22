import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// base "/" funciona no Netlify e na Vercel.
// No GitHub Pages (site de projeto) o workflow em .github/workflows/deploy.yml
// passa --base=/NOME-DO-REPO/ automaticamente.
export default defineConfig({
  base: "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Élo — Prontuário de bolso",
        short_name: "Élo",
        description: "Cadastro, avaliação, prontuário, evolução e prescrição de fisioterapia no bolso.",
        lang: "pt-BR",
        theme_color: "#0e5c57",
        background_color: "#f4eee2",
        display: "standalone",
        orientation: "portrait",
        start_url: ".",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      }
    })
  ]
});
