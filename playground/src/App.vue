<template>
  <main class="playground">
    <header class="playground__header">
      <div class="playground__brand">
        <div class="playground__logo">
          🎋
        </div>
        <div class="playground__title">
          <h1>Bamboo Editor Playground</h1>
          <p>小巧、简单的编辑器</p>
        </div>
      </div>
      <div class="playground__controls">
        <div class="playground__control-group">
          <span class="playground__label">设备</span>
          <div class="playground__switcher">
            <button
              type="button"
              class="playground__switch"
              :class="{ 'is-active': device === 'pc' }"
              @click="device = 'pc'"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <path d="M8 21h8M12 17v4"/>
              </svg>
              PC
            </button>
            <button
              type="button"
              class="playground__switch"
              :class="{ 'is-active': device === 'mobile' }"
              @click="device = 'mobile'"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="6" y="2" width="12" height="20" rx="2"/>
                <path d="M12 18h.01"/>
              </svg>
              Mobile
            </button>
          </div>
        </div>
        <div class="playground__control-group">
          <span class="playground__label">字数限制</span>
          <div class="playground__switcher">
            <button
              type="button"
              class="playground__switch"
              :class="{ 'is-active': maxLength === undefined }"
              @click="maxLength = undefined"
            >
              无限
            </button>
            <button
              type="button"
              class="playground__switch"
              :class="{ 'is-active': maxLength === 500 }"
              @click="maxLength = 500"
            >
              500
            </button>
          </div>
        </div>
      </div>
    </header>

    <section class="playground__grid">
      <!-- Editor -->
      <div class="editor-wrapper">
        <BambooEditor v-model="html" height="auto" :device="device" :upload-handler="uploadHandler" :color-palette="colorPalette" :max-length="maxLength" :video-options="videoOptions" />
      </div>

      <!-- Output Panel (HTML + Preview Tabs) -->
      <article class="panel panel--output">
        <div class="panel__header">
          <div class="output-tabs">
            <button
              type="button"
              class="output-tab"
              :class="{ 'is-active': activeTab === 'html' }"
              @click="activeTab = 'html'"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="16 18 22 12 16 6"/>
                <polyline points="8 6 2 12 8 18"/>
              </svg>
              HTML 代码
            </button>
            <button
              type="button"
              class="output-tab"
              :class="{ 'is-active': activeTab === 'preview' }"
              @click="activeTab = 'preview'"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              渲染预览
            </button>
          </div>
          <button v-if="activeTab === 'preview'" type="button" class="fullscreen-btn" @click="toggleFullscreen" :title="isFullscreen ? '退出全屏' : '全屏预览'">
            <svg v-if="!isFullscreen" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>
          </button>
        </div>
        <div class="panel__content panel__content--output" ref="outputPanel">
          <!-- HTML Tab -->
          <div v-show="activeTab === 'html'" class="code-view">
            <pre class="code-block"><code>{{ html }}</code></pre>
          </div>
          <!-- Preview Tab -->
          <div v-show="activeTab === 'preview'" class="preview-view" :style="previewColorStyle">
            <div class="bamboo-content" v-html="html"></div>
          </div>
        </div>
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
const activeTab = ref<'html' | 'preview'>('html')

const isFullscreen = ref(false)
const outputPanel = ref<HTMLElement | null>(null)

function toggleFullscreen() {
  if (!isFullscreen.value) {
    outputPanel.value?.requestFullscreen()
    isFullscreen.value = true
  } else {
    document.exitFullscreen()
    isFullscreen.value = false
  }
}

function onFullscreenChange() {
  isFullscreen.value = document.fullscreenElement === outputPanel.value
}
document.addEventListener('fullscreenchange', onFullscreenChange)

const html = ref(`
<h1>Bamboo Editor</h1>
<hr>
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
/* ===== Light Theme Design System ===== */
:root {
  /* Colors - Clean Light Theme */
  --pg-bg-primary: #fafafa;
  --pg-bg-secondary: #ffffff;
  --pg-bg-tertiary: #f5f5f5;
  --pg-bg-elevated: #ffffff;

  --pg-text-primary: #18181b;
  --pg-text-secondary: #52525b;
  --pg-text-tertiary: #a1a1aa;
  --pg-text-muted: #71717a;

  --pg-accent-primary: #0891b2;
  --pg-accent-hover: #0e7490;
  --pg-accent-bg: rgba(8, 145, 178, 0.08);

  --pg-border-subtle: #e4e4e7;
  --pg-border-default: #d4d4d8;
  --pg-border-elevated: #a1a1aa;

  --pg-code-bg: #f8fafc;
  --pg-code-text: #334155;

  /* Typography */
  --pg-font-body: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --pg-font-mono: 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;

  /* Spacing */
  --pg-space-1: 4px;
  --pg-space-2: 8px;
  --pg-space-3: 12px;
  --pg-space-4: 16px;
  --pg-space-5: 20px;
  --pg-space-6: 24px;
  --pg-space-8: 32px;

  /* Radii */
  --pg-radius-sm: 6px;
  --pg-radius-md: 8px;
  --pg-radius-lg: 12px;
  --pg-radius-xl: 16px;

  /* Shadows */
  --pg-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
  --pg-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --pg-shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
}

/* ===== Base ===== */
*, *::before, *::after {
  box-sizing: border-box;
}

html {
  font-family: var(--pg-font-body);
  font-size: 14px;
  line-height: 1.5;
  color: var(--pg-text-primary);
  background: var(--pg-bg-primary);
  -webkit-font-smoothing: antialiased;
}

body {
  margin: 0;
  height: 100vh;
  overflow: hidden;
  background: var(--pg-bg-primary);
}

/* ===== Layout ===== */
.playground {
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--pg-space-6) var(--pg-space-6) 5vh;
  height: 100vh;
  display: flex;
  flex-direction: column;
  gap: var(--pg-space-6);
}

/* ===== Header ===== */
.playground__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--pg-space-5);
  padding-bottom: var(--pg-space-4);
  border-bottom: 1px solid var(--pg-border-subtle);
}

.playground__brand {
  display: flex;
  align-items: center;
  gap: var(--pg-space-3);
}

.playground__logo {
  font-size: 32px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  flex-shrink: 0;
}

.playground__title h1 {
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  margin: 0 0 2px;
  color: var(--pg-text-primary);
}

.playground__title p {
  font-size: 0.8125rem;
  color: var(--pg-text-muted);
  margin: 0;
}

.playground__controls {
  display: flex;
  align-items: center;
  gap: var(--pg-space-5);
}

.playground__control-group {
  display: flex;
  align-items: center;
  gap: var(--pg-space-2);
}

.playground__label {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--pg-text-tertiary);
}

.playground__switcher {
  display: flex;
  background: var(--pg-bg-secondary);
  border: 1px solid var(--pg-border-subtle);
  border-radius: var(--pg-radius-md);
  padding: 2px;
  gap: 2px;
}

.playground__switch {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 10px;
  border: none;
  border-radius: var(--pg-radius-sm);
  background: transparent;
  color: var(--pg-text-muted);
  font-family: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms ease;
}

.playground__switch:hover {
  color: var(--pg-text-secondary);
  background: var(--pg-bg-tertiary);
}

.playground__switch.is-active {
  color: var(--pg-accent-primary);
  background: var(--pg-accent-bg);
  font-weight: 600;
}

.playground__switch svg {
  opacity: 0.8;
}

/* ===== Grid ===== */
.playground__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: minmax(0, 1fr);
  gap: var(--pg-space-5);
  flex: 1;
  min-height: 0;
}

/* ===== Editor ===== */
.editor-wrapper {
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* ===== Panel ===== */
.panel {
  background: var(--pg-bg-secondary);
  border: 1px solid var(--pg-border-subtle);
  border-radius: var(--pg-radius-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--pg-shadow-sm);
  min-height: 0;
}

.panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--pg-space-3);
  padding: var(--pg-space-3) var(--pg-space-4);
  background: var(--pg-bg-tertiary);
  border-bottom: 1px solid var(--pg-border-subtle);
  flex-shrink: 0;
}

.panel__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--pg-radius-sm);
  background: var(--pg-accent-bg);
  color: var(--pg-accent-primary);
}

.panel__title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--pg-text-secondary);
  margin: 0;
  flex: 1;
}

.panel__content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.panel__content--output {
  display: flex;
  flex-direction: column;
}

/* ===== Output Tabs ===== */
.output-tabs {
  display: flex;
  gap: var(--pg-space-1);
  flex: 1;
}

.output-tab {
  display: inline-flex;
  align-items: center;
  gap: var(--pg-space-2);
  height: 32px;
  padding: 0 var(--pg-space-3);
  border: none;
  border-radius: var(--pg-radius-sm);
  background: transparent;
  color: var(--pg-text-muted);
  font-family: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms ease;
}

.output-tab:hover {
  color: var(--pg-text-secondary);
  background: var(--pg-bg-secondary);
}

.output-tab.is-active {
  color: var(--pg-text-primary);
  background: var(--pg-bg-elevated);
  box-shadow: var(--pg-shadow-sm);
}

/* ===== Code View ===== */
.code-view {
  flex: 1;
  overflow: auto;
  background: var(--pg-code-bg);
}

.code-block {
  margin: 0;
  padding: var(--pg-space-5);
  font-family: var(--pg-font-mono);
  font-size: 0.8125rem;
  line-height: 1.7;
  color: var(--pg-code-text);
  white-space: pre-wrap;
  word-break: break-word;
}

/* ===== Preview View ===== */
.preview-view {
  flex: 1;
  overflow: auto;
  background: #ffffff;
}

.preview-view .bamboo-content {
  padding: var(--pg-space-6);
  color: #18181b;
  line-height: 1.6;
}

.preview-view .bamboo-content h1,
.preview-view .bamboo-content h2,
.preview-view .bamboo-content h3 {
  color: #09090b;
  margin-top: 0;
}

.preview-view .bamboo-content p,
.preview-view .bamboo-content li {
  color: #18181b;
}

/* ===== Fullscreen Button ===== */
.fullscreen-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--pg-border-subtle);
  border-radius: var(--pg-radius-sm);
  background: var(--pg-bg-secondary);
  color: var(--pg-text-muted);
  cursor: pointer;
  transition: all 150ms ease;
}

.fullscreen-btn:hover {
  border-color: var(--pg-border-default);
  color: var(--pg-text-secondary);
  background: var(--pg-bg-tertiary);
}

/* ===== Preview Colors ===== */
.bamboo-content span[data-color='cyan'] { color: var(--preview-color-cyan, #0891b2); }
.bamboo-content span[data-color='success'] { color: var(--preview-color-success, #16a34a); }
.bamboo-content span[data-color='warning'] { color: var(--preview-color-warning, #ea580c); }
.bamboo-content span[data-color='danger'] { color: var(--preview-color-danger, #dc2626); }
.bamboo-content span[data-color='muted'] { color: var(--preview-color-muted, #71717a); }
.bamboo-content span[data-color='purple'] { color: var(--preview-color-purple, #7c3aed); }
.bamboo-content span[data-color='pink'] { color: var(--preview-color-pink, #db2777); }
.bamboo-content span[data-color='yellow'] { color: var(--preview-color-yellow, #ca8a04); }
.bamboo-content span[data-color='blue'] { color: var(--preview-color-blue, #2563eb); }

/* ===== Fullscreen Mode ===== */
.panel__content--output:fullscreen {
  width: 100vw;
  height: 100vh;
  background: var(--pg-bg-secondary);
}

.panel__content--output:fullscreen .preview-view {
  background: #ffffff;
}

/* ===== Responsive ===== */
@media (max-width: 1024px) {
  .playground__grid {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
  }

  .playground {
    padding: var(--pg-space-4) var(--pg-space-4) 5vh;
  }
}

@media (max-width: 640px) {
  .playground__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .playground__controls {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
</style>