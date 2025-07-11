import string from "vite-plugin-string";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-05-15",
  modules: ["@nuxt/eslint", "@tresjs/nuxt", "@nuxt/devtools"],
  devtools: {
    enabled: true,
    timeline: {
      enabled: true,
    },
    launchEditor: "webstorm",
  },
  tres: {
    devtools: true,
  },
  devServer: {
    host: "localhost",
  },
  vite: {
    plugins: [string({ include: "**/*.glsl" })],
  },
  app: {
    baseURL: "/",
  },
  imports: {
    scan: false,
  },
  components: {
    dirs: [],
  },
});
