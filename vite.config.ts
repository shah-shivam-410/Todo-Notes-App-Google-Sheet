import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.GITHUB_ACTIONS === "true" ? "/Todo-Notes-App-Google-Sheet/" : "/",
});
