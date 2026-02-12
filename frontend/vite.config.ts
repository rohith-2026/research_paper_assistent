import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ["react-is"],
  },
  server: {
    host: true,        // allow LAN / tunnel access
    port: 5173,
    strictPort: true,
    allowedHosts: [
      ".trycloudflare.com", // ✓ allow trycloudflare tunnel domains
      ".ngrok-free.dev",    // allow ngrok tunnel domains
      "autogenetic-mercedez-pseudocharitable.ngrok-free.dev"
    ],
  },
});
