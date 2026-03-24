<template>
  <svg
    class="toolbar-icon"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <g v-if="name === 'heading1'" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 6V18" />
      <path d="M11 6V18" />
      <path d="M5 12H11" />
      <path d="M15 8L17 6V18" />
      <path d="M14 18H20" />
    </g>

    <g v-else-if="name === 'heading2'" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 6V18" />
      <path d="M11 6V18" />
      <path d="M5 12H11" />
      <path d="M15 9C15.6 7.8 16.5 7 17.8 7C19.57 7 21 8.34 21 10C21 11.1 20.52 12.06 19.61 12.88L15 17H21" />
    </g>

    <g v-else-if="name === 'heading3'" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 6V18" />
      <path d="M11 6V18" />
      <path d="M5 12H11" />
      <path d="M15 8.5C15.8 7.55 16.8 7 18 7C19.66 7 21 8.12 21 9.5C21 10.74 19.98 11.69 18.65 11.96C20.11 12.17 21.2 13.16 21.2 14.7C21.2 16.52 19.67 17.8 17.75 17.8C16.28 17.8 15.05 17.23 14.2 16.1" />
    </g>

    <g v-else-if="name === 'bold'" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 5H13.2C15.85 5 18 6.9 18 9.25C18 10.8 17.02 12.08 15.6 12.65C17.15 13.16 18.2 14.5 18.2 16.2C18.2 18.85 16.05 21 13.4 21H8V5Z" />
      <path d="M8 13H13.3" />
    </g>

    <g v-else-if="name === 'italic'" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 5H19" />
      <path d="M5 19H10" />
      <path d="M14 5L10 19" />
    </g>

    <g v-else-if="name === 'strike'" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 12H19" />
      <path d="M8.2 7.8C9 6.75 10.23 6.2 11.6 6.2C13.84 6.2 15.8 7.44 15.8 9.1C15.8 10.72 14.05 11.55 11.8 12.2C9.55 12.85 7.8 13.68 7.8 15.3C7.8 16.96 9.76 18.2 12 18.2C13.37 18.2 14.6 17.65 15.4 16.6" />
    </g>

    <g v-else-if="name === 'code'" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 8L4 12L9 16" />
      <path d="M15 8L20 12L15 16" />
    </g>

    <g v-else-if="name === 'bullet-list'" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 7H20" />
      <path d="M9 12H20" />
      <path d="M9 17H20" />
      <circle cx="5" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="5" cy="17" r="1" fill="currentColor" stroke="none" />
    </g>

    <g v-else-if="name === 'ordered-list'" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10 7H20" />
      <path d="M10 12H20" />
      <path d="M10 17H20" />
      <path d="M4.5 6H6V10" />
      <path d="M4 14C4 12.9 4.9 12 6 12C7.1 12 8 12.9 8 14C8 14.78 7.56 15.46 6.92 15.79L4 18H8" />
    </g>

    <g v-else-if="name === 'quote'" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M7 10H10V17H5V12C5 8.69 7.69 6 11 6" />
      <path d="M14 10H17V17H12V12C12 8.69 14.69 6 18 6" />
    </g>

    <g v-else-if="name === 'code-block'" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M9 10L7 12L9 14" />
      <path d="M15 10L17 12L15 14" />
    </g>

    <g v-else-if="name === 'image'" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
      <rect x="4.5" y="5.5" width="15" height="13" rx="2" />
      <circle cx="9" cy="10" r="1.2" />
      <path d="M7.5 15.5L10.8 12.2L13.2 14.6L15.4 12.4L17.5 14.5" />
    </g>

    <g v-else-if="name === 'fullscreen-enter'" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 4H4V8" />
      <path d="M16 4H20V8" />
      <path d="M20 16V20H16" />
      <path d="M8 20H4V16" />
    </g>

    <g v-else-if="name === 'fullscreen-exit'" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 4H4V9" />
      <path d="M15 4H20V9" />
      <path d="M20 15V20H15" />
      <path d="M9 20H4V15" />
      <path d="M9 9L4 4" />
      <path d="M15 9L20 4" />
      <path d="M15 15L20 20" />
      <path d="M9 15L4 20" />
    </g>
  </svg>
</template>

<script setup lang="ts">
type ToolbarIconName =
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bold'
  | 'italic'
  | 'strike'
  | 'code'
  | 'bullet-list'
  | 'ordered-list'
  | 'quote'
  | 'code-block'
  | 'image'
  | 'fullscreen-enter'
  | 'fullscreen-exit'

defineProps<{
  name: ToolbarIconName
}>()
</script>

<style scoped>
.toolbar-icon {
  width: 15px;
  height: 15px;
  display: block;
  flex: none;
}
</style>
