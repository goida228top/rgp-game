import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Относительные пути для GitHub Pages
  build: {
    outDir: 'dist', // Куда складывать готовую игру
    emptyOutDir: true, // Очищать папку перед сборкой
  },
  server: {
    watch: {
      ignored: ['**/server/**'] // Не следить за изменениями в папке сервера при разработке
    }
  }
});