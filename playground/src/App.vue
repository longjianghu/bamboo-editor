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
        <button type="button" @click="maxLength = 500">max=500</button>
      </div>
    </header>

    <section class="playground__grid">
      <article class="panel">
        <h2>Editor</h2>
        <BambooEditor v-model="html" :device="device" :upload-handler="uploadHandler" :color-palette="colorPalette" :max-length="maxLength" :video-options="videoOptions" />
      </article>

      <article class="panel panel--code">
        <h2>HTML</h2>
        <pre class="panel__code"><code>{{ html }}</code></pre>
      </article>

      <article class="panel panel--preview" ref="previewPanel">
        <h2>
          <span>Preview</span>
          <button type="button" class="fullscreen-btn" @click="toggleFullscreen" :title="isFullscreen ? '退出全屏' : '全屏预览'">
            <svg v-if="!isFullscreen" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>
          </button>
        </h2>
        <div class="bamboo-content" :style="previewColorStyle" v-html="html"></div>
      </article>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { BambooEditor } from '@bamboo-editor/vue3'
import '@bamboo-editor/styles/bamboo-content.css'

const device = ref<'pc' | 'mobile'>('pc')
const maxLength = ref<number | undefined>(500)
const videoOptions = { maxSize: 30 }

const isFullscreen = ref(false)
const previewPanel = ref<HTMLElement | null>(null)

function toggleFullscreen() {
  if (!isFullscreen.value) {
    previewPanel.value?.requestFullscreen()
    isFullscreen.value = true
  } else {
    document.exitFullscreen()
    isFullscreen.value = false
  }
}

// 监听全屏变化，同步状态
function onFullscreenChange() {
  isFullscreen.value = document.fullscreenElement === previewPanel.value
}
document.addEventListener('fullscreenchange', onFullscreenChange)
const html = ref(`
<h1>Bamboo Editor</h1>
<p><strong>纯净 HTML</strong> 输出，适合 Web 与微信小程序展示。</p>
<p>字体颜色测试：
<span data-color="cyan">青色</span>、
<span data-color="success">绿色</span>、
<span data-color="warning">橙色</span>、
<span data-color="danger">红色</span>、
<span data-color="muted">灰色</span>、
<span data-color="purple">紫色</span>、
<span data-color="pink">粉色</span>、
<span data-color="yellow">黄色</span>、
<span data-color="blue">蓝色</span>。
</p>
<ul>
  <li>PC / Mobile 双端编辑</li>
  <li>mp-html 优先</li>
  <li>通过 CSS 控制展示</li>
</ul>

<p>测试图片</p>
<img src="https://picsum.photos/seed/bamboo/800/400" width="800" height="400" alt="测试图片" data-align="center">

<p>测试视频</p>
<video src="https://www.w3schools.com/html/mov_bbb.mp4" controls="controls" data-align="center"></video>

<p>测试音频</p>
<audio src="https://www.w3schools.com/html/horse.mp3" controls="controls" data-align="center"></audio>
`)

const colorPalette = [
  { token: 'cyan', label: '青色', value: '#0891b2' },
  { token: 'success', label: '绿色', value: '#16a34a' },
  { token: 'warning', label: '橙色', value: '#ea580c' },
  { token: 'danger', label: '红色', value: '#dc2626' },
  { token: 'muted', label: '灰色', value: '#71717a' },
  { token: 'purple', label: '紫色', value: '#7c3aed' },
  { token: 'pink', label: '粉色', value: '#db2777' },
  { token: 'yellow', label: '黄色', value: '#ca8a04' },
  { token: 'blue', label: '蓝色', value: '#2563eb' },
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

.bamboo-content span[data-color='cyan'] {
  color: var(--preview-color-cyan, #0891b2);
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

.bamboo-content span[data-color='pink'] {
  color: var(--preview-color-pink, #db2777);
}

.bamboo-content span[data-color='yellow'] {
  color: var(--preview-color-yellow, #ca8a04);
}

.bamboo-content span[data-color='blue'] {
  color: var(--preview-color-blue, #2563eb);
}

.panel :where(.bamboo-content, .bamboo-content *) {
  max-width: 100%;
  box-sizing: border-box;
}

/* Preview panel fullscreen styles */
.panel--preview h2 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
}

.fullscreen-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: #f4f4f5;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: #52525b;
  transition: all 0.2s ease;
}

.fullscreen-btn:hover {
  background: #e4e4e7;
  color: #18181b;
}

.panel--preview {
  display: flex;
  flex-direction: column;
}

.panel--preview .bamboo-content {
  flex: 1;
  overflow-y: auto;
}

/* Fullscreen mode styles */
.panel--preview:fullscreen {
  max-width: none;
  width: 100vw;
  height: 100vh;
  border-radius: 0;
  padding: 24px;
  background: #fff;
}

.panel--preview:fullscreen h2 {
  font-size: 18px;
  margin-bottom: 16px;
  flex: none;
}

.panel--preview:fullscreen .bamboo-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px;
}

.panel--preview:fullscreen .fullscreen-btn {
  width: 32px;
  height: 32px;
}

/* Webkit fullscreen prefix */
.panel--preview:-webkit-full-screen {
  max-width: none;
  width: 100vw;
  height: 100vh;
  border-radius: 0;
  padding: 24px;
  background: #fff;
}

.panel--preview:-webkit-full-screen h2 {
  font-size: 18px;
  margin-bottom: 16px;
  flex: none;
}

.panel--preview:-webkit-full-screen .bamboo-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px;
}

.panel--preview:-webkit-full-screen .fullscreen-btn {
  width: 32px;
  height: 32px;
}
</style>
