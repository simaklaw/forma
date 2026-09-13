import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  server: { host: "0.0.0.0", port: 8080 },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  plugins: [tailwindcss(), tanstackStart(), viteReact()],
});
