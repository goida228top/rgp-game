import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Относительные пути для правильной работы на GitHub Pages
  build: {
    emptyOutDir: true, // Очищать папку перед сборкой
  },
  server: {
    watch: {
      ignored: ['**/server/**'] // Не следить за изменениями в папке сервера при разработке
    }
  }
});