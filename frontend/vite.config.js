import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Plugin React + Tailwind CSS, server di port 5173
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
});
