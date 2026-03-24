# Bamboo Editor

一个面向多端内容发布的纯净 HTML 富文本编辑器，支持 PC / Mobile 编辑，推荐通过 `mp-html` 在微信小程序中渲染。

## 项目定位

Bamboo Editor 不是通用 Office 型编辑器，而是面向以下场景的内容编辑基础设施：

- CMS 文章发布
- 招聘 JD / 公告内容
- 活动图文详情
- 电商图文描述
- 企业知识库 / 帮助中心
- 需要同时支持 Web 与微信小程序展示的富文本内容

一句话描述：**为多端内容发布而设计、优先适配 `mp-html` 的纯净 HTML 编辑器。**

## 为什么选择 HTML 而不是 Markdown

Markdown 适合文档类内容，但在图片、引用、代码块、跨端渲染一致性等富内容场景下存在限制。Bamboo Editor 选择把受控语义化 HTML 作为内容契约：

- 编辑态：使用 Tiptap 提供良好交互体验
- 存储态：保存纯净 HTML
- 展示态：通过 CSS 渲染，不依赖编辑器运行时

## 特性

- 输出受控、语义化、可长期存储的 HTML
- 编辑端支持 PC 与移动端两套交互模式
- 展示端仅依赖 CSS，不依赖编辑器运行时
- 小程序优先适配 `mp-html`，`rich-text` 作为兼容补充
- 用户可通过覆盖 CSS 自定义展示风格

## 架构

```text
编辑态：Vue3 Component → Tiptap Editor → 纯净 HTML → 数据库
展示态（Web）：数据库 HTML → bamboo-content.css → 浏览器渲染
展示态（小程序）：数据库 HTML → mp-html / rich-text → bamboo-content.weapp.css → 小程序渲染
```

### Monorepo 结构

```text
packages/
  core/    # Tiptap 扩展、sanitize / validate、内容契约
  vue3/    # Vue 3 组件与编辑体验
  styles/  # Web / 小程序展示样式
playground/ # 本地演示与联调
```

## 快速开始

### 安装

```bash
pnpm add @bamboo-editor/vue3 @bamboo-editor/styles
```

### 使用编辑器

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { BambooEditor } from '@bamboo-editor/vue3'
import '@bamboo-editor/vue3/dist/index.css'
import '@bamboo-editor/styles/src/bamboo-content.css'

const html = ref('<p>请输入内容</p>')

async function uploadHandler(file: File) {
  return {
    src: URL.createObjectURL(file),
    alt: file.name,
    width: 800,
  }
}
</script>

<template>
  <BambooEditor
    v-model="html"
    device="auto"
    height="420px"
    :upload-handler="uploadHandler"
  />

  <div class="bamboo-content" v-html="html"></div>
</template>
```

### 本地运行 playground

```bash
pnpm dev
```

## Vue3 组件 API

### Props

- `modelValue: string`：当前 HTML 内容
- `device?: 'pc' | 'mobile' | 'auto'`：编辑器模式，默认 `auto`
- `placeholder?: string`：占位文案，默认 `请输入内容`
- `disabled?: boolean`：是否禁用编辑器
- `uploadHandler?: (file: File) => Promise<{ src: string; alt?: string; width?: number }>`：图片上传处理函数
- `height?: string`：编辑区高度，默认 `50vh`，内容超出时编辑区内部滚动
- 对齐：默认左对齐不输出属性；居中 / 右对齐会输出 `data-align="center" | "right"`

### Emits

- `update:modelValue`：返回最新 HTML

## 输出规范

Bamboo Editor 保存的不是“任意 HTML”，而是一个**受控 HTML 子集**。

### v0.1 支持的标签

- 文本：`h1`, `h2`, `h3`, `p`, `br`
- 样式：`strong`, `em`, `del`, `code`
- 链接：`a`
- 列表：`ul`, `ol`, `li`
- 媒体：`img`
- 代码块：`pre`, `code`
- 引用：`blockquote`

### 属性白名单

- `a`：`href`
- `p`, `h1`, `h2`, `h3`, `blockquote`：`data-align`（仅允许 `center` / `right`，默认左对齐不输出）
- `img`：`src`, `alt`, `data-width`, `data-align`（仅允许 `center` / `right`，默认左对齐不输出）

### 禁止内容

- `class`
- `style`
- `id`
- `onclick` 等事件属性
- `<script>`, `<iframe>`, `<video>` 等危险或超范围标签

### 图片输出

编辑态允许有临时上传状态，但最终持久化输出必须收敛为：

```html
<img src="https://cdn.com/img.jpg" alt="示例图片" data-width="800">
```

### 对齐输出

默认左对齐不输出属性；仅在居中或右对齐时输出：

```html
<p data-align="center">这是一段居中内容</p>
<h2 data-align="right">这是一个右对齐标题</h2>
<img src="https://cdn.com/example.jpg" alt="示例图片" data-align="center">
```

## 小程序兼容策略

- 主方案：`mp-html`
- 辅方案：微信原生 `rich-text`
- 输出 HTML 子集优先保证 `mp-html` 下稳定渲染

建议：微信小程序优先通过 `mp-html` 渲染 Bamboo Editor 输出的 HTML。

## v0.1 范围

### 已规划能力

- Heading (`h1` - `h3`)
- Paragraph / Line break
- Bold / Italic / Strike / Inline code
- Bullet list / Ordered list
- Blockquote
- Code block
- Image
- `sanitizeHtml()`
- `validateHtml()`
- PC / Mobile 双端编辑器 UI
- Web / Weapp 展示样式

### 暂不包含

- 复杂表格
- 协同编辑
- 评论 / 批注
- AI 写作
- Markdown 双向转换
- 任意富样式控制
- 视频、iframe 等复杂嵌入内容
- 任意 HTML 导入保真

## 设计原则

- 存储格式选择**纯净语义化 HTML**，不以 Markdown 作为核心存储格式
- 展示端不依赖编辑器运行时 JS
- 编辑器内部临时状态不污染最终输出
- 优先打通 **PC / Mobile 双端编辑 + Web / 小程序展示闭环**

## 开发状态

当前仓库处于 v0.1 初始化阶段，接下来将逐步补齐：

1. core 包
2. vue3 包
3. styles 包
4. playground
5. 更多 sanitize / validate / fixture / 展示能力

## License

待定
