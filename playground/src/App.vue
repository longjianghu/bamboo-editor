<template>
  <main class="playground">
    <header class="playground__header">
      <div>
        <h1>Bamboo Editor Playground</h1>
        <p>编辑、HTML 输出、展示渲染三栏联调。</p>
      </div>
      <div class="playground__switches">
        <button type="button" @click="device = 'pc'">PC</button>
        <button type="button" @click="device = 'mobile'">Mobile</button>
      </div>
    </header>

    <section class="playground__grid">
      <article class="panel">
        <h2>Editor</h2>
        <BambooEditor v-model="html" :device="device" :upload-handler="uploadHandler" />
      </article>

      <article class="panel">
        <h2>HTML</h2>
        <pre>{{ html }}</pre>
      </article>

      <article class="panel">
        <h2>Preview</h2>
        <div class="bamboo-content" v-html="html"></div>
      </article>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { BambooEditor } from '@bamboo-editor/vue3'
import '@bamboo-editor/styles/src/bamboo-content.css'

const device = ref<'pc' | 'mobile'>('pc')
const html = ref(`
<h1>Bamboo Editor</h1>
<p><strong>纯净 HTML</strong> 输出，适合 Web 与微信小程序展示。</p>
<ul>
  <li>PC / Mobile 双端编辑</li>
  <li>mp-html 优先</li>
  <li>通过 CSS 控制展示</li>
</ul>
`)

async function uploadHandler(file: File) {
  return {
    src: URL.createObjectURL(file),
    alt: file.name,
    width: 800,
  }
}
</script>

<style>
:root {
  color: #18181b;
  background: #f5f5f5;
  font-family: Inter, system-ui, sans-serif;
}

body {
  margin: 0;
}

.playground {
  max-width: 1440px;
  margin: 0 auto;
  padding: 24px;
}

.playground__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.playground__switches {
  display: flex;
  gap: 8px;
}

.playground__switches button {
  height: 36px;
  padding: 0 14px;
}

.playground__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

.panel {
  background: #fff;
  border: 1px solid #e4e4e7;
  border-radius: 16px;
  padding: 16px;
}

.panel pre {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
