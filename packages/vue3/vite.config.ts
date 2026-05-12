import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'BambooEditorVue3',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['vue', '@tiptap/vue-3', '@bamboo-editor/core'],
    },
  },
})
