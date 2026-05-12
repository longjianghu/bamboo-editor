# ESLint + Prettier 配置实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为项目配置 ESLint 和 Prettier，统一代码风格，符合 Vue3 + TypeScript + pnpm monorepo 的现代前端项目标准。

**Architecture:** 采用 @antfu/eslint-config (社区最佳实践)，它内置支持 Vue、TypeScript、Prettier 整合。在根目录统一配置，各 packages 通过 `extends` 继承，确保一致性。

**Tech Stack:** pnpm、@antfu/eslint-config、Prettier、Vue3、TypeScript

---

## 文件结构

| 文件                           | 目的                                       |
| ------------------------------ | ------------------------------------------ |
| `eslint.config.mjs`            | 根目录 ESLint 配置，引入 @antfu 配置并微调 |
| `.prettierrc`                  | Prettier 格式配置                          |
| `.prettierignore`              | 忽略 Prettier 的文件清单                   |
| `package.json`                 | 添加 lint/format 脚本                      |
| `packages/*/eslint.config.mjs` | 各包延伸根配置（如需要）                   |

---

### Task 1: 安装依赖

**Files:**

- Modify: `package.json`

- [ ] **Step 1: 添加开发依赖到根 package.json**

```json
{
  "devDependencies": {
    "@antfu/eslint-config": "^3.0.0",
    "prettier": "^3.3.0",
    "eslint": "^9.0.0"
  },
  "scripts": {
    "build": "pnpm -r build",
    "dev": "pnpm --filter @bamboo-editor/playground dev",
    "pack:check": "pnpm --dir packages/core pack && pnpm --dir packages/vue3 pack && pnpm --dir packages/styles pack",
    "release:check": "pnpm build && pnpm pack:check",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier . --write",
    "format:check": "prettier . --check"
  }
}
```

- [ ] **Step 2: 安装依赖**

```bash
pnpm install
```

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): 安装 @antfu/eslint-config 和 prettier"
```

---

### Task 2: 创建 ESLint 配置

**Files:**

- Create: `eslint.config.mjs`

- [ ] **Step 1: 创建根目录 ESLint 配置**

```javascript
// eslint.config.mjs
import antfu from '@antfu/eslint-config'

export default antfu(
  {
    // Vue 支持
    vue: true,
    // TypeScript 支持
    typescript: true,
    // Prettier 整合
    formatters: {
      html: true,
      css: true,
      svg: true,
      prettierOptions: {
        semi: false,
        singleQuote: true,
      },
    },
    // 不要修改平台文件
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.output/**',
      '**/.turbo/**',
      'playground/dist/**',
      'packages/*/dist/**',
    ],
  },
  // 自定义规则
  {
    rules: {
      // 允许使用 console 在编辑器项目中
      'no-console': 'off',
      // 优化 vue/html 格式
      'vue/html-self-closing': [
        'error',
        {
          html: {
            void: 'always',
            normal: 'never',
            component: 'always',
          },
          svg: 'always',
          math: 'always',
        },
      ],
    },
  },
)
```

- [ ] **Step 2: 验证配置**

```bash
pnpm eslint --print-config packages/core/src/index.ts | head -20
```

预期: 打印 ESLint 配置配置内容

- [ ] **Step 3: Commit**

```bash
git add eslint.config.mjs
git commit -m "chore: 配置 @antfu/eslint-config"
```

---

### Task 3: 创建 Prettier 配置

**Files:**

- Create: `.prettierrc`
- Create: `.prettierignore`

- [ ] **Step 1: 创建 Prettier 配置**

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "tabWidth": 2,
  "printWidth": 120,
  "endOfLine": "lf"
}
```

- [ ] **Step 2: 创建忽略文件**

```
# 构建输出
dist/
*.tsbuildinfo

# 依赖
node_modules/

# 日志
*.log

# IDE
.idea/
.vscode/
.DS_Store
```

- [ ] **Step 3: Commit**

```bash
git add .prettierrc .prettierignore
git commit -m "chore: 配置 Prettier"
```

---

### Task 4: 第一次格式化所有代码

**Files:**

- Modify: 所有 `.ts`、`.vue` 文件（自动生成 diff）

- [ ] **Step 1: 运行 ESLint fix**

```bash
pnpm lint:fix
```

预期: 自动修复大部分格式问题

- [ ] **Step 2: 运行 Prettier**

```bash
pnpm format
```

预期: 格式化所有支持的文件

- [ ] **Step 3: 检查剩余问题**

```bash
pnpm lint
```

预期: 显示无法自动修复的问题（如有）

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "style: 格式化所有代码"
```

---

### Task 5: 验证构建仍然通过

**Files:**

- 无修改

- [ ] **Step 1: 运行构建**

```bash
pnpm build
```

预期: 所有包构建成功，无类型错误

- [ ] **Step 2: 如有问题修复**

如果构建失败，检查：

1. 是否格式化导致引用修改出问题
2. 是否有 ESLint 自动修复导致的逻辑变更

通常问题：

- `as any` 被 ESLint 移除但需要保留 → 添加 `// eslint-disable-next-line @typescript-eslint/no-explicit-any`
- 导入顺序被重新排序 → 无影响功能

- [ ] **Step 3: Commit**

```bash
git status
# 确保工作区干净（或者那些修复已提交）
git commit -m "ci: 验证构建通过后提交"
```

---

## 验证清单

完成后确保：

- [ ] `pnpm lint` 返回无错误
- [ ] `pnpm format:check` 返回无错误
- [ ] `pnpm build` 所有包构建成功
- [ ] `.vscode/settings.json` (如需要) 已配置保存时自动格式化

---

## 后续建议

1. **CI 集成**: 在 `.github/workflows/*.yml` 添加 `pnpm lint` 和 `pnpm format:check` 步骤
2. **VSCode 整合**: 添加 `.vscode/settings.json` 自动保存格式化
3. **Git Hooks** (可选): 使用 `simple-git-hooks` 或 `husky` 提交前检查
