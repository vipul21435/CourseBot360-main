import { defineConfig } from 'vite';

// The site is served from https://vipul21435.github.io/CourseBot360-main/,
// so assets have to resolve under that sub-path in a production build.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/CourseBot360-main/' : '/',
  build: { outDir: 'dist', sourcemap: true },
}));
