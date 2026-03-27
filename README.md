# Bamboo Editor

一个面向多端内容发布的纯净 HTML 富文本编辑器，支持 PC / Mobile 编辑，输出受控语义化 HTML，推荐通过 `mp-html` 在微信小程序中渲染。

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

## 当前特性

- 输出受控、语义化、可长期存储的 HTML
- 编辑端支持 PC 与移动端两套交互模式
- 支持 PC 全屏编辑
- 移动端支持底部工具栏与选区浮动工具栏
- 支持标题、正文、加粗、斜体、删除线、行内代码
- 支持无序列表、有序列表、引用、代码块、分割线
- 支持链接新增 / 编辑 / 移除
- 支持本地图片上传与远程图片插入
- 支持受控颜色 token 与自定义调色板
- 支持粘贴 HTML 清洗、输出 sanitize、结果 validate
- 支持可选 `maxLength` 字符限制、粘贴截断、IME 兼容与双端计数反馈
- 展示端仅依赖 CSS，不依赖编辑器运行时
- 小程序优先适配 `mp-html`，`rich-text` 作为兼容补充

## 架构

```text
编辑态：Vue3 Component → Tiptap Editor → 纯净 HTML → 数据库
展示态（Web）：数据库 HTML → bamboo-content.css → 浏览器渲染
展示态（小程序）：数据库 HTML → mp-html / rich-text → bamboo-content.weapp.css → 小程序渲染
```

## Monorepo 结构

```text
packages/
  core/    # Tiptap 扩展、sanitize / validate / paste sanitizer、内容契约
  vue3/    # Vue 3 组件、composable、PC / Mobile 编辑体验
  styles/  # Web / 小程序展示样式
playground/ # 本地演示、联调与示例用法
```

### 包职责

- `@bamboo-editor/core`
  - 提供编辑器扩展装配入口与受控 HTML 处理能力
  - 对外暴露 `createBambooEditorOptions`、`getDefaultExtensions`、`sanitizeHtml`、`validateHtml`、`sanitizePastedHtml`
- `@bamboo-editor/vue3`
  - 提供 `BambooEditor` 组件、`useBambooEditor` composable，以及相关类型导出
- `@bamboo-editor/styles`
  - 提供展示态样式文件，包含 Web 与微信小程序两套内容样式
- `playground`
  - 提供本地演示环境，用于验证 PC / Mobile、HTML 输出、展示渲染、自定义颜色和 `maxLength`

## 快速开始

### 安装

常规接入：

```bash
pnpm add @bamboo-editor/vue3 @bamboo-editor/styles
```

如果你需要直接使用 sanitize / validate 等能力：

```bash
pnpm add @bamboo-editor/core
```

### 使用编辑器

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { BambooEditor } from '@bamboo-editor/vue3'
import '@bamboo-editor/vue3/style.css'
import '@bamboo-editor/styles/bamboo-content.css'

const html = ref('<p>请输入内容</p>')

const colorPalette = [
  { token: 'primary', label: '主色', value: '#18181b' },
  { token: 'brand-blue', label: '品牌蓝', value: '#2563eb' },
]

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
    :max-length="1000"
    :color-palette="colorPalette"
    :upload-handler="uploadHandler"
  />

  <div class="bamboo-content" v-html="html"></div>
</template>
```

> `@bamboo-editor/styles` 当前直接发布 `src` 下的样式文件，因此展示样式请从 `@bamboo-editor/styles/src/...` 引入。

### 直接使用 core API

```ts
import { sanitizeHtml, validateHtml } from '@bamboo-editor/core'

const rawHtml = '<p style="color:red">Hello <script>alert(1)</script></p>'
const cleanHtml = sanitizeHtml(rawHtml)
const result = validateHtml(cleanHtml)

console.log(cleanHtml)
console.log(result.isValid, result.errors)
```

### 本地运行 playground

```bash
pnpm dev
```

playground 当前包含：

- Editor / HTML / Preview 三栏联调
- PC / Mobile 模式切换
- `Unlimited` / `max=50` 字符限制切换
- 自定义颜色 token 示例（如 `brand-blue`）
- 图片上传 handler 示例

## Vue3 组件 API

`@bamboo-editor/vue3` 当前导出：

- `BambooEditor`
- `useBambooEditor`
- `BambooColorOption`
- `BambooDevice`
- `UploadHandler`
- `UploadResult`
- `UseBambooEditorOptions`

### BambooEditor Props

- `modelValue: string`：当前 HTML 内容
- `device?: 'pc' | 'mobile' | 'auto'`：编辑器模式，默认 `auto`
- `placeholder?: string`：占位文案，默认 `请输入内容`
- `disabled?: boolean`：是否禁用编辑器
- `uploadHandler?: (file: File) => Promise<{ src: string; alt?: string; width?: number }>`：图片上传处理函数
- `height?: string`：编辑区高度，默认 `50vh`，内容超出时编辑区内部滚动
- `colorPalette?: Array<{ token: string; label: string; value: string }>`：文字颜色面板配置，默认提供 `primary / success / warning / danger / muted / purple`
- `maxLength?: number`：可选字符数上限；达到上限后会阻止继续输入，并对粘贴内容进行截断处理

### BambooEditor Emits

- `update:modelValue`：返回最新 HTML

### 组件行为说明

- `device="auto"` 时会根据视口宽度在 PC / Mobile 模式之间切换
- 编辑器初始化内容、用户输入结果和 `v-model` 输出都会经过 sanitize 收敛
- PC 模式提供完整工具栏、全屏能力与右下角统计信息
- Mobile 模式提供底部工具栏、扩展面板和选区浮动工具栏
- 支持链接新增 / 编辑 / 移除、远程图片插入、本地图片上传、分割线插入、清除格式
- 配置 `maxLength` 后，普通输入、粘贴、中文输入法上屏后的最终结果都会按统一字符语义限制

### useBambooEditor

`useBambooEditor` 适合自定义编辑器外壳时复用当前编辑能力，公开类型与导出位于：

- `packages/vue3/src/index.ts`
- `packages/vue3/src/composables/useBambooEditor.ts`

如果只是业务接入，优先使用 `BambooEditor` 组件即可。

## Core API

`@bamboo-editor/core` 当前对外提供以下主要能力：

### `createBambooEditorOptions(options?)`

返回可直接传给 Tiptap `Editor` 的配置，内部已装配：

- 受控扩展集合
- placeholder
- paste sanitize
- `CharacterCount`
- `maxLength` 相关输入拦截、粘贴截断、IME 兼容逻辑

### `getDefaultExtensions(options?)`

返回 Bamboo Editor 默认扩展集合，适合高级接入方按需复用或自定义组合。

### `sanitizeHtml(html, options?)`

将任意输入 HTML 清洗并收敛到 Bamboo Editor 允许的受控 HTML 子集。

### `sanitizePastedHtml(html, options?)`

用于粘贴场景的 HTML 预清洗：会去掉多余包裹结构、无关属性，并继续走 sanitize 流程。

### `validateHtml(html, options?)`

校验 HTML 是否符合 Bamboo Editor 的受控输出规范，并返回结构化错误信息，而不是直接修改输入。

## 输出规范

Bamboo Editor 保存的不是“任意 HTML”，而是一个**受控 HTML 子集**。

### 支持的标签

- 文本：`h1`, `h2`, `h3`, `p`, `br`
- 样式：`strong`, `em`, `del`, `code`, `span[data-color]`
- 链接：`a`
- 列表：`ul`, `ol`, `li`
- 媒体：`img`
- 代码块：`pre`, `code`
- 引用：`blockquote`
- 分割线：`hr`

### 属性白名单

- `a`：`href`
- `p`, `h1`, `h2`, `h3`, `blockquote`：`data-align`（仅允许 `center` / `right`，默认左对齐不输出）
- `img`：`src`, `alt`, `data-width`, `data-align`（仅允许 `center` / `right`，默认左对齐不输出）
- `span`：`data-color`（仅允许配置白名单内的 token）

### 限制规则

- 不允许 `class`、`style`、`id`、事件属性等自由注入
- 会拦截或判定非法的危险标签，如 `<script>`、`<iframe>`、`<video>`、`<style>`
- `href` 不允许 `javascript:` 协议
- 未知 `data-color` token 会在 sanitize / validate 阶段被清理或判定非法
- 空的无意义标签会在 sanitize 阶段被移除

### sanitize 与 validate 的区别

- `sanitizeHtml()`：直接清洗输入，输出可持久化的安全 HTML
- `validateHtml()`：只负责校验并返回错误，适合在入库、迁移或审查流程中使用

### 图片输出

编辑态允许有临时上传状态，但最终持久化输出会收敛为：

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

### 文字颜色输出

文字颜色使用受控 token 协议，不保存真实十六进制值：

```html
<p>普通文字与 <span data-color="danger">强调文字</span></p>
```

默认内置 token：`primary`、`success`、`warning`、`danger`、`muted`、`purple`。
接入方可通过 `colorPalette` / `colorTokens` 扩展更多 token；编辑器会立即识别并渲染，展示端需同步补充对应 CSS。

### 分割线输出

分割线以纯净语义标签输出，不带额外属性：

```html
<hr>
```

## 编辑能力说明

- 撤销 / 重做：基于编辑历史回退与恢复最近操作
- 清除格式：移除当前选区的文字样式、颜色、链接，并将标题 / 列表 / 引用等块级格式收敛为普通正文，不删除正文内容本身
- 粘贴清洗：粘贴外部 HTML 时会清理 `style` / `class` / `id`，展开多余包裹标签，并继续经过 sanitize 流程收敛到受控 HTML 子集
- 链接能力：支持创建、编辑、移除链接
- 图片能力：支持本地上传预览后替换为正式地址，也支持直接插入远程图片 URL
- 字符限制：`maxLength` 按纯文本字符数统计，图片不计入、链接只计显示文本、换行计 1、Emoji 按 `Array.from(text).length` 计数

## 展示样式

### Web

```ts
import '@bamboo-editor/styles/src/bamboo-content.css'
```

### 微信小程序

使用小程序渲染时可配合：

```text
@bamboo-editor/styles/src/bamboo-content.weapp.css
```

如果你扩展了自定义颜色 token，还需要在展示端补充对应 token 的样式映射。

## 小程序兼容策略

- 主方案：`mp-html`
- 辅方案：微信原生 `rich-text`
- 输出 HTML 子集优先保证 `mp-html` 下稳定渲染

建议：微信小程序优先通过 `mp-html` 渲染 Bamboo Editor 输出的 HTML。

## 当前范围

当前版本已经覆盖：

- Heading (`h1` - `h3`)
- Paragraph / Line break
- Bold / Italic / Strike / Inline code
- Bullet list / Ordered list
- Blockquote
- Code block
- Horizontal rule
- Link
- Image upload / remote image
- `sanitizeHtml()`
- `validateHtml()`
- `sanitizePastedHtml()`
- `maxLength` 字符限制
- PC / Mobile 双端编辑器 UI
- Web / Weapp 展示样式
- 本地 playground

## 暂不包含

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

## License

MIT
