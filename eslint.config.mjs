// eslint.config.mjs
import antfu from '@antfu/eslint-config'

export default antfu(
  {
    // Vue 支持
    vue: true,
    // TypeScript 支持
    typescript: true,
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
      // Vue SFC 中 defineProps 之前有 import/type 是正常的
      'vue/define-macros-order': 'off',
      // Vue SFC <script setup> 中变量声明顺序由编译器处理
      'ts/no-use-before-define': 'off',
      // 允许在扩展的 Tiptap 命令中使用 as any
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
)
