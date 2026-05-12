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
    },
  },
)
