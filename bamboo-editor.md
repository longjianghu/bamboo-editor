# 🎋 Bamboo Editor - 项目描述

**项目定位**：一个基于 Tiptap 2.x 的现代富文本编辑器，支持 PC 和移动端编辑，生成纯净语义化 HTML，通过 CSS 控制展示，重点适配微信小程序内容渲染。

**一句话描述**：为多端内容发布而设计、优先适配 `mp-html` 的纯净 HTML 编辑器。

**时间戳**：2026-03-23 17:30

---

## 0. 产品定位与边界

### 为什么不是 Markdown

原始设想曾考虑使用 Markdown 作为存储和输出格式，但在目标场景下，HTML 更适合作为最终内容契约。

**Markdown 的主要问题：**

- 对图片、表格、引用、代码块等富内容表达能力有限
- 不同渲染器之间展示一致性较差
- 到微信小程序场景时通常仍需转换为 HTML 再渲染
- 不利于统一 Web / H5 / 小程序的展示结果

**因此，Bamboo Editor 选择：**

- **编辑态**：使用 Tiptap 提供良好交互体验
- **存储态**：保存受控、纯净、语义化 HTML
- **展示态**：仅通过 CSS 控制样式，不依赖编辑器运行时

### 核心目标

Bamboo Editor 不是通用 Office 型编辑器，而是面向以下场景的内容编辑基础设施：

- CMS 文章发布
- 招聘 JD / 公告内容
- 活动图文详情
- 电商图文描述
- 企业知识库 / 帮助中心
- 需要同时支持 Web 与微信小程序展示的富文本内容

### 第一版不做

为控制范围，第一版明确**不追求**以下能力：

- 协同编辑
- 评论 / 批注
- AI 写作
- Markdown 双向转换
- 任意富样式控制（字体颜色、字号、行高、对齐等）
- 视频、iframe 等复杂嵌入内容
- 复杂表格能力（合并单元格、拖拽列宽）
- 任意 HTML 导入保真

---

## 1. 核心架构（必须遵循）

### 三层架构设计

- **Core 层** (`packages/core/`)：Headless 编辑器逻辑，Tiptap 扩展配置，负责生成零类名、零内联样式的纯净 HTML，并提供 sanitize / validate 能力
- **Vue3 Adapter** (`packages/vue3/`)：Vue 3 组件封装，负责编辑体验，使用 Tailwind CSS 构建编辑器界面（工具栏、编辑区）
- **Style Presets** (`packages/styles/`)：纯 CSS 展示方案，用户只需引入 CSS 文件即可渲染内容，并可通过覆盖 CSS 自定义展示风格

### 数据流原则

```text
编辑态：Vue3 Component → Tiptap Editor → 纯净 HTML → 数据库
展示态（Web）：数据库 HTML → bamboo-content.css → 浏览器渲染
展示态（小程序）：数据库 HTML → mp-html / rich-text → bamboo-content.weapp.css → 小程序渲染
```

### 内容契约（Content Contract）

Bamboo Editor 保存的不是“任意 HTML”，而是一个**受控 HTML 子集**：

- 由 Bamboo Editor 的 schema 生成
- 可被 `sanitize` 修正
- 可被 `validate` 校验
- 可长期存储
- 可稳定用于 Web / H5 / 微信小程序渲染

---

## 2. 技术栈约束

### 必须使用

- **编辑器引擎**：Tiptap 2.2+ (ProseMirror 封装)
- **框架**：Vue 3.4+ (Composition API + `<script setup>`)
- **构建工具**：Vite 5 (Library Mode)
- **样式系统**：Tailwind CSS 3.4+ (仅用于编辑器界面，不污染输出 HTML)
- **Monorepo**：pnpm workspaces

### 禁止使用

- 内联 style 属性输出到 HTML
- 自动生成的 class 名（如 `ProseMirror-focused`）输出到保存的 HTML
- IE 兼容代码 (假设现代浏览器 Chrome 88+, Safari 14+, iOS 13+)
- 让展示端依赖编辑器运行时 JS

---

## 3. 小程序兼容策略（关键决策）

### 渲染优先级

- **主方案**：`mp-html`
- **辅方案**：微信原生 `rich-text`

### 设计原则

- 输出 HTML 子集优先保证 `mp-html` 下稳定渲染
- 同时尽量保持在 `rich-text` 下基础可用
- 不为了兼容 `rich-text` 而过度牺牲内容表达能力
- 小程序默认展示样式由 `bamboo-content.weapp.css` 提供

### 对外说明建议

- 微信小程序推荐通过 `mp-html` 渲染 Bamboo Editor 输出的 HTML
- `rich-text` 可作为轻量兼容方案
- Bamboo Editor 输出受控语义化 HTML，便于多端统一渲染和样式覆盖

---

## 4. HTML 输出规范（关键约束）

保存到数据库的 HTML **必须**符合以下规范：

### 允许的 Tags

#### v0.1 稳定支持

- **文本**：`h1`, `h2`, `h3`, `p`, `br`
- **样式**：`strong`, `em`, `del`, `code` (inline)
- **列表**：`ul`, `ol`, `li`
- **媒体**：`img`
- **代码块**：`pre`, `code` (block)
- **引用**：`blockquote`

#### v0.2 可扩展支持

- **表格**：`table`, `thead`, `tbody`, `tr`, `th`, `td`

### 属性白名单

- `img`：只允许 `src`, `alt`, `data-width`
- 其他标签默认不允许附加展示类属性
- 禁止 `class`, `style`, `id`, `onclick` 等非必要属性

### 禁止的内容

- 任何 `class=""` 属性
- 任何 `style=""` 内联样式
- `<script>`, `<iframe>`, `<video>` 等危险或超范围标签
- 任意事件属性（如 `onclick`）
- 非 schema 允许的自定义节点

### 空节点策略

- 最终保存时移除无意义空标签
- 保证输出 HTML 尽可能简洁
- 编辑器内部临时占位结构不得污染最终输出

### 图片策略

图片上传过程允许编辑器内部存在临时状态，但最终持久化输出必须收敛为：

```html
<img src="https://cdn.com/img.jpg" alt="示例图片" data-width="800">
```

例如：

- 编辑态可出现 Base64 预览
- 编辑态可存在临时上传标记
- 最终保存前必须移除临时属性，仅保留白名单属性

### 示例正确输出

```html
<h1>招聘前端工程师</h1>
<p><strong>岗位职责：</strong></p>
<ul>
  <li>负责小程序开发</li>
  <li>使用 Vue3 + Tiptap</li>
</ul>
<img src="https://cdn.com/img.jpg" alt="办公环境" data-width="800">
<blockquote><p>支持 PC 与移动端编辑。</p></blockquote>
```

---

## 5. 文件结构（必须生成）

```text
bamboo-editor/
├── packages/
│   ├── core/
│   │   ├── src/
│   │   │   ├── extensions/          # 自定义 Tiptap 扩展（CleanImage, CleanHeading 等）
│   │   │   ├── schema/              # 节点和标记定义
│   │   │   ├── sanitize/            # sanitize / validate / paste 规则
│   │   │   ├── fixtures/            # 标准 HTML 输入输出样例
│   │   │   └── index.ts             # Core 入口，导出 Editor 创建函数
│   │   └── package.json
│   ├── vue3/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── BambooEditor.vue    # 主编辑器组件
│   │   │   │   ├── ToolbarPC.vue       # PC 顶部工具栏
│   │   │   │   └── ToolbarMobile.vue   # 移动端底部工具栏
│   │   │   ├── composables/
│   │   │   │   └── useBambooEditor.ts  # 封装 Tiptap 初始化逻辑
│   │   │   └── index.ts
│   │   └── package.json
│   └── styles/
│       ├── src/
│       │   ├── bamboo-content.css        # Web 端展示样式（rem）
│       │   ├── bamboo-content.weapp.css  # 小程序展示样式（适配 mp-html）
│       │   └── themes/
│       │       ├── default.css           # 默认主题变量
│       │       └── dark.css              # 暗黑模式（后续）
│       └── package.json
├── playground/
│   ├── pc.html                          # PC 端测试页
│   ├── mobile.html                      # 移动端测试页
│   └── preview.html                     # 编辑态 / HTML 输出 / 展示态对照页
├── package.json
└── README.md
```

---

## 6. MVP 功能边界（v0.1）

### v0.1 必须打通的闭环

1. **PC / Mobile 双端编辑可用**
2. **输出受控纯净 HTML**
3. **HTML 可回灌编辑器**
4. **Web 展示可直接通过 CSS 渲染**
5. **小程序展示推荐通过 mp-html 正常渲染**
6. **用户可通过覆盖 CSS 自定义展示风格**

### v0.1 核心功能模块

#### Phase 1 - Core 基础

- [ ] 扩展：CleanHeading (h1-h3, 无 class 输出)
- [ ] 扩展：CleanImage (img, 支持上传接口注入)
- [ ] 扩展：CleanList (ul/ol, 嵌套支持)
- [ ] 扩展：CleanBlockquote
- [ ] 扩展：CleanCodeBlock
- [ ] 工具函数：HTML 净化器 `sanitizeHtml()`
- [ ] 工具函数：HTML 校验器 `validateHtml()`
- [ ] 粘贴清洗规则（paste sanitizer）

#### Phase 2 - Vue3 组件

- [ ] `BambooEditor.vue` 主组件
  - Props: `modelValue` (html string), `uploadHandler` (function), `device` (`'pc' | 'mobile' | 'auto'`)
  - Emits: `update:modelValue`
  - 支持根据窗口宽度自动切换 PC / Mobile UI
- [ ] `ToolbarPC.vue`: PC 顶部工具栏，偏完整模式
- [ ] `ToolbarMobile.vue`: 移动端底部固定工具栏，偏简洁模式，大按钮适合触摸
- [ ] 图片上传：支持 Base64 预览 + 异步上传替换 URL

#### Phase 3 - 样式系统

- [ ] `bamboo-content.css`: Web 默认展示样式
- [ ] `bamboo-content.weapp.css`: 小程序展示样式，优先适配 `mp-html`
- [ ] 使用 CSS Variables 暴露常用主题变量
- [ ] 支持通过覆盖 CSS 自定义展示风格

### v0.1 暂缓功能

- [ ] 表格编辑能力（延后到 v0.2）
- [ ] 暗黑模式
- [ ] rich-text 深度兼容优化
- [ ] rpx 自动换算产物
- [ ] 复杂粘贴保真

---

## 7. 后续扩展方向（v0.2+）

### v0.2 重点

- [ ] 扩展：CleanTable（基础插入、增删行列）
- [ ] Web / 小程序样式进一步对齐
- [ ] 小程序主题定制方案
- [ ] 更多 HTML fixtures 与回归测试

### 表格策略

如果在 v0.2 中引入表格，第一阶段仅支持：

- 插入表格
- 插入 / 删除行列
- 纯净 `table / thead / tbody / tr / th / td`
- 不支持合并单元格
- 不支持拖拽调列宽
- 不保留样式属性

---

## 8. 关键实现细节（给 AI 的提示）

### Tiptap 扩展编写规范

所有自定义扩展必须重写 `renderHTML`，确保不输出 class：

```typescript
const CleanHeading = Heading.extend({
  renderHTML({ node }) {
    return [`h${node.attrs.level}`, 0]
  },

  addAttributes() {
    return {
      level: {
        default: 1,
        parseHTML: element => Number(element.tagName.charAt(1)),
      },
    }
  },
})
```

### 编辑器内部状态 vs 最终输出

必须区分：

- **编辑器内部状态**：允许存在临时 attrs、Base64 预览、上传中标记
- **最终输出 HTML**：只能保留白名单标签和属性

### Vue 组件交互策略

PC 与 Mobile 不是简单响应式布局，而是两套交互模型：

#### PC 模式

- 顶部工具栏
- 按钮可更密集
- 面向鼠标与键盘操作

#### Mobile 模式

- 底部固定工具栏
- 高优先级功能前置
- 按钮更大、减少复杂弹层
- 面向触摸和软键盘场景

### Core API 建议

建议优先暴露以下 API：

```typescript
createBambooEditor(options)
sanitizeHtml(html)
validateHtml(html)
getDefaultExtensions(options)
```

其中 `validateHtml()` 应返回结构化错误信息，例如：

```typescript
{
  valid: false,
  errors: [
    { type: 'forbidden_attribute', tag: 'p', attr: 'style' },
    { type: 'forbidden_tag', tag: 'iframe' }
  ]
}
```

### 上传接口建议

```typescript
type UploadHandler = (file: File) => Promise<{
  src: string
  alt?: string
  width?: number
}>
```

### CSS 架构规范

- **编辑态**：使用 Tailwind 类（如 `bg-white`, `rounded-lg`）
- **展示态**：使用语义化选择器（如 `.bamboo-content h1`），零 Tailwind 类
- **隔离**：展示样式必须通过 `.bamboo-content` 命名空间包裹
- **定制**：优先通过 CSS Variables 和覆盖规则进行主题调整

---

## 9. 测试与验收标准（Definition of Done）

### 输出约束测试

- [ ] 编辑生成的 HTML 无任何 `class` 或 `style` 属性
- [ ] 无危险标签与危险属性
- [ ] 输出节点嵌套合法

### 回灌测试

- [ ] `editor.getHTML()` 输出结果重新加载后结构不丢失
- [ ] heading / list / image / blockquote / code block 可正确恢复

### 展示一致性测试

- [ ] Web 端仅引入 `bamboo-content.css` 即可正确渲染
- [ ] 小程序端通过 `mp-html` 渲染，样式不乱，图片自适应宽度
- [ ] `rich-text` 作为辅方案时基础内容可用

### 交互测试

- [ ] 支持 PC 和 Mobile 自动切换布局
- [ ] 图片上传后先显示 Base64，上传成功后替换为 URL，无明显闪烁
- [ ] 移动端工具栏在触摸场景下可用

---

## 10. 当前开发结论

Bamboo Editor 的第一阶段目标不是做一个全能编辑器，而是先打通下面这条闭环：

- 可编辑
- 可存储
- 可回显
- 可展示
- 可在微信小程序中稳定渲染

**当前明确决策：**

- 存储格式选择 **纯净语义化 HTML**，不以 Markdown 作为核心存储格式
- 小程序渲染以 **`mp-html` 为主，`rich-text` 为辅**
- 第一版先聚焦 **PC / Mobile 双端编辑 + Web / 小程序展示闭环**
- 表格能力放入后续版本，优先保证基础内容块稳定可用

---

**后续实现请基于以上约束，优先生成 Bamboo Editor v0.1 的初始项目结构，并围绕“纯净 HTML + mp-html 优先 + PC / Mobile 双端编辑”进行设计与实现。**
