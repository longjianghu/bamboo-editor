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
        <button type="button" @click="maxLength = undefined">Unlimited</button>
        <button type="button" @click="maxLength = 50">max=50</button>
      </div>
    </header>

    <section class="playground__grid">
      <article class="panel">
        <h2>Editor</h2>
        <BambooEditor v-model="html" :device="device" :upload-handler="uploadHandler" :color-palette="colorPalette" :max-length="maxLength" />
      </article>

      <article class="panel panel--code">
        <h2>HTML</h2>
        <pre class="panel__code"><code>{{ html }}</code></pre>
      </article>

      <article class="panel">
        <h2>Preview</h2>
        <div class="bamboo-content" :style="previewColorStyle" v-html="html"></div>
      </article>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { BambooEditor } from '@bamboo-editor/vue3'
import '@bamboo-editor/styles/src/bamboo-content.css'

const device = ref<'pc' | 'mobile'>('pc')
const maxLength = ref<number | undefined>(50)
const html = ref(`
<h1>Bamboo Editor</h1>
<p><strong>纯净 HTML</strong> 输出，适合 Web 与微信小程序展示。</p>
<p>支持 <span data-color="danger">受控颜色 token</span> 与 <span data-color="brand-blue">自定义品牌色</span>。</p>
<ul>
  <li>PC / Mobile 双端编辑</li>
  <li>mp-html 优先</li>
  <li>通过 CSS 控制展示</li>
</ul>
`)

const colorPalette = [
  { token: 'primary', label: '主色', value: '#18181b' },
  { token: 'success', label: '绿色', value: '#16a34a' },
  { token: 'warning', label: '橙色', value: '#ea580c' },
  { token: 'danger', label: '红色', value: '#dc2626' },
  { token: 'muted', label: '灰色', value: '#71717a' },
  { token: 'purple', label: '紫色', value: '#7c3aed' },
  { token: 'brand-blue', label: '品牌蓝', value: '#2563eb' },
]

const previewColorStyle = computed(() => {
  return Object.fromEntries(colorPalette.map((item) => [`--preview-color-${item.token}`, item.value]))
})

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
  min-width: 0;
  background: #fff;
  border: 1px solid #e4e4e7;
  border-radius: 16px;
  padding: 16px;
  overflow: hidden;
}

.panel--code {
  display: flex;
  flex-direction: column;
}

.panel--code h2 {
  flex: none;
}

.panel__code {
  flex: 1;
  min-width: 0;
  max-width: 100%;
  margin: 0;
  padding: 12px;
  overflow-x: auto;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
  box-sizing: border-box;
  background: #fafafa;
  border: 1px solid #e4e4e7;
  border-radius: 12px;
}

.panel__code code {
  display: block;
  min-width: 0;
  max-width: 100%;
  white-space: inherit;
}

.bamboo-content span[data-color='primary'] {
  color: var(--preview-color-primary, #18181b);
}

.bamboo-content span[data-color='success'] {
  color: var(--preview-color-success, #16a34a);
}

.bamboo-content span[data-color='warning'] {
  color: var(--preview-color-warning, #ea580c);
}

.bamboo-content span[data-color='danger'] {
  color: var(--preview-color-danger, #dc2626);
}

.bamboo-content span[data-color='muted'] {
  color: var(--preview-color-muted, #71717a);
}

.bamboo-content span[data-color='purple'] {
  color: var(--preview-color-purple, #7c3aed);
}

.bamboo-content span[data-color='brand-blue'] {
  color: var(--preview-color-brand-blue, #2563eb);
}

.panel :where(.bamboo-content, .bamboo-content *) {
  max-width: 100%;
  box-sizing: border-box;
}
</style>
