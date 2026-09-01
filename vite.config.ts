import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// اللعبة تُفتح بالنقر المزدوج على dist/index.html من القرص مباشرة.
// المتصفحات تمنع وحدات ES عبر بروتوكول file:// (سياسة CORS، الأصل null)،
// لذا يُبنى المشروع حزمةً واحدة بصيغة IIFE، ثم يزيل scripts/postbuild.mjs
// السمتين type="module" و crossorigin من الصفحة.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    modulePreload: false,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'assets/app.js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
})
