# Bamboo Editor

一个面向多端内容发布的纯净 HTML 富文本编辑器，支持 PC / Mobile 编辑，推荐通过 `mp-html` 在微信小程序中渲染。

## 特性

- 输出受控、语义化、可长期存储的 HTML
- 编辑端支持 PC 与移动端两套交互模式
- 展示端仅依赖 CSS，不依赖编辑器运行时
- 小程序优先适配 `mp-html`，`rich-text` 作为兼容补充
- 用户可通过覆盖 CSS 自定义展示风格

## 定位

Bamboo Editor 不是通用 Office 型编辑器，而是面向以下场景的内容编辑基础设施：

- CMS 文章发布
- 招聘 JD / 公告内容
- 活动图文详情
- 电商图文描述
- 企业知识库 / 帮助中心
- 需要同时支持 Web 与微信小程序展示的富文本内容

## 为什么选择 HTML 而不是 Markdown

Markdown 适合文档类内容，但在图片、表格、代码块、跨端渲染一致性等富内容场景下存在限制。Bamboo Editor 选择把受控语义化 HTML 作为内容契约：

- 编辑态：使用 Tiptap 提供良好交互体验
- 存储态：保存纯净 HTML
- 展示态：通过 CSS 渲染，不依赖编辑器运行时

## 架构

```text
编辑态：Vue3 Component → Tiptap Editor → 纯净 HTML → 数据库
展示态（Web）：数据库 HTML → bamboo-content.css → 浏览器渲染
展示态（小程序）：数据库 HTML → mp-html / rich-text → bamboo-content.weapp.css → 小程序渲染
```

## Monorepo 结构

```text
packages/
  core/    # Tiptap 扩展、sanitize / validate、内容契约
  vue3/    # Vue 3 组件与编辑体验
  styles/  # Web / 小程序展示样式
playground/ # 本地演示与联调
```

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

## 小程序兼容策略

- 主方案：`mp-html`
- 辅方案：原生 `rich-text`
- 输出 HTML 子集优先保证 `mp-html` 下稳定渲染

## 开发状态

当前仓库处于 v0.1 初始化阶段，接下来将逐步补齐：

1. monorepo 脚手架
2. core 包
3. vue3 包
4. styles 包
5. playground

## License

待定
