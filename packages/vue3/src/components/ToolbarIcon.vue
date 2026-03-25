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

    <g v-else-if="name === 'image'" fill="currentColor" stroke="none">
      <path d="M828.708571 585.045333a48.761905 48.761905 0 0 0-48.737523 48.761905v18.529524l-72.143238-72.167619a135.972571 135.972571 0 0 0-191.585524 0l-34.133334 34.133333-120.880762-120.953905a138.898286 138.898286 0 0 0-191.585523 0l-72.167619 72.167619V292.400762a48.786286 48.786286 0 0 1 48.761904-48.761905h341.23581a48.737524 48.737524 0 0 0 34.474667-83.285333 48.737524 48.737524 0 0 0-34.474667-14.287238H146.236952A146.212571 146.212571 0 0 0 0 292.400762v585.289143A146.358857 146.358857 0 0 0 146.236952 1024h584.996572a146.212571 146.212571 0 0 0 146.236952-146.310095V633.807238a48.786286 48.786286 0 0 0-48.761905-48.761905zM146.261333 926.45181a48.737524 48.737524 0 0 1-48.761904-48.761905v-174.128762l141.409523-141.458286a38.497524 38.497524 0 0 1 53.126096 0l154.526476 154.624 209.627428 209.724953H146.236952z m633.734096-48.761905c-0.073143 9.337905-3.145143 18.383238-8.777143 25.843809l-219.843048-220.94019 34.133333-34.133334a37.546667 37.546667 0 0 1 53.613715 0l140.873143 141.897143V877.714286zM1009.615238 160.231619L863.329524 13.897143a48.737524 48.737524 0 0 0-16.091429-10.24c-11.849143-4.87619-25.161143-4.87619-37.059047 0a48.761905 48.761905 0 0 0-16.067048 10.24l-146.236952 146.334476a49.005714 49.005714 0 0 0 69.217523 69.241905l62.902858-63.390476v272.627809a48.761905 48.761905 0 1 0 97.475047 0V166.083048l62.902857 63.390476a48.737524 48.737524 0 0 0 69.217524 0 48.761905 48.761905 0 0 0 0-69.241905z" transform="scale(0.0234375)" />
    </g>

    <g v-else-if="name === 'remote-image'" fill="currentColor" stroke="none">
      <path d="M959.877 128l0.123 0.123v767.775l-0.123 0.122H64.102l-0.122-0.122V128.123l0.122-0.123h895.775zM960 64H64C28.795 64 0 92.795 0 128v768c0 35.205 28.795 64 64 64h896c35.205 0 64-28.795 64-64V128c0-35.205-28.795-64-64-64zM832 288.01c0 53.023-42.988 96.01-96.01 96.01s-96.01-42.987-96.01-96.01S682.967 192 735.99 192 832 234.988 832 288.01zM896 832H128V704l224.01-384 256 320h64l224.01-192z" transform="scale(0.0234375)" />
    </g>

    <g v-else-if="name === 'align-left'" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 7H19" />
      <path d="M5 10H15" />
      <path d="M5 13H19" />
      <path d="M5 16H15" />
    </g>

    <g v-else-if="name === 'align-center'" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 7H19" />
      <path d="M7 10H17" />
      <path d="M4 13H20" />
      <path d="M7 16H17" />
    </g>

    <g v-else-if="name === 'align-right'" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 7H19" />
      <path d="M11 10H19" />
      <path d="M5 13H19" />
      <path d="M11 16H19" />
    </g>

    <g v-else-if="name === 'link'" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10.5 13.5L13.5 10.5" />
      <path d="M7.5 16.5L5.5 18.5C4.12 19.88 4.12 22.12 5.5 23.5C6.88 24.88 9.12 24.88 10.5 23.5L12.5 21.5" transform="translate(0 -4)" />
      <path d="M16.5 7.5L18.5 5.5C19.88 4.12 22.12 4.12 23.5 5.5C24.88 6.88 24.88 9.12 23.5 10.5L21.5 12.5" transform="translate(-4 0)" />
    </g>

    <g v-else-if="name === 'undo'" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 7H16C18.761 7 21 9.239 21 12C21 14.761 18.761 17 16 17H7" />
      <path d="M8 4L4 7L8 10" />
    </g>

    <g v-else-if="name === 'redo'" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M15 7H8C5.239 7 3 9.239 3 12C3 14.761 5.239 17 8 17H17" />
      <path d="M16 4L20 7L16 10" />
    </g>

    <g v-else-if="name === 'clear-format'" fill="currentColor" stroke="none">
      <path d="M554.3 850.7L981 424c12.5-12.5 12.5-32.8 0-45.3L636.7 34.6c-12.5-12.5-32.8-12.5-45.3 0L90.5 535.5c-50 50-50 131 0 181l272.1 270.3c24 23.8 56.4 37.2 90.2 37.2H864c17.7 0 32-14.3 32-32s-14.3-32-32-32H599.5c-57 0-85.6-68.9-45.2-109.3z m71.1-736.9l276.4 276.4c6.2 6.2 6.2 16.4 0 22.6L607.9 706.6l-299-299 293.8-293.9c6.3-6.2 16.4-6.2 22.7 0.1zM135.8 580.7l127.9-127.9 299 299-127.9 127.9c-25 25-65.5 25-90.5 0L135.8 671.3c-25-25-25-65.6 0-90.6z" transform="scale(0.0234375)" />
    </g>

    <g v-else-if="name === 'horizontal-rule'" fill="currentColor" stroke="none">
      <path d="M0 51.2m51.2 0l989.866667 0q51.2 0 51.2 51.2l0 0q0 51.2-51.2 51.2l-989.866667 0q-51.2 0-51.2-51.2l0 0q0-51.2 51.2-51.2Z" transform="scale(0.021978 0.0234375)" />
      <path d="M0 460.8m51.2 0l170.666667 0q51.2 0 51.2 51.2l0 0q0 51.2-51.2 51.2l-170.666667 0q-51.2 0-51.2-51.2l0 0q0-51.2 51.2-51.2Z" transform="scale(0.021978 0.0234375)" />
      <path d="M819.2 460.8m51.2 0l170.666667 0q51.2 0 51.2 51.2l0 0q0 51.2-51.2 51.2l-170.666667 0q-51.2 0-51.2-51.2l0 0q0-51.2 51.2-51.2Z" transform="scale(0.021978 0.0234375)" />
      <path d="M409.6 460.8m51.2 0l170.666667 0q51.2 0 51.2 51.2l0 0q0 51.2-51.2 51.2l-170.666667 0q-51.2 0-51.2-51.2l0 0q0-51.2 51.2-51.2Z" transform="scale(0.021978 0.0234375)" />
      <path d="M0 870.4m51.2 0l989.866667 0q51.2 0 51.2 51.2l0 0q0 51.2-51.2 51.2l-989.866667 0q-51.2 0-51.2-51.2l0 0q0-51.2 51.2-51.2Z" transform="scale(0.021978 0.0234375)" />
    </g>

    <g v-else-if="name === 'text-color'" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 18L12 6L16 18" />
      <path d="M9.5 14H14.5" />
      <path d="M6 20H18" />
    </g>

    <g v-else-if="name === 'text-color-clear'" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 18L12 6L16 18" />
      <path d="M9.5 14H14.5" />
      <path d="M6 20H18" />
      <path d="M6 6L18 18" />
    </g>

    <g v-else-if="name === 'chevron-down'" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M7 10L12 15L17 10" />
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
  | 'undo'
  | 'redo'
  | 'clear-format'
  | 'horizontal-rule'
  | 'bullet-list'
  | 'ordered-list'
  | 'quote'
  | 'code-block'
  | 'image'
  | 'remote-image'
  | 'link'
  | 'text-color'
  | 'text-color-clear'
  | 'chevron-down'
  | 'align-left'
  | 'align-center'
  | 'align-right'
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
