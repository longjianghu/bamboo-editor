import { computed, ref, watch } from 'vue'

interface DeviceRef {
  value: string
}

/**
 * 编辑器全屏模式管理
 */
export function useEditorFullscreen(resolvedDevice: DeviceRef) {
  const isFullscreen = ref(false)

  const surfaceStyle = computed(() => {
    if (isFullscreen.value) {
      return undefined
    }

    return {
      height: 'auto',
    }
  })

  function toggleFullscreen() {
    if (resolvedDevice.value !== 'pc') {
      return
    }

    isFullscreen.value = !isFullscreen.value
  }

  function exitFullscreen() {
    isFullscreen.value = false
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && isFullscreen.value) {
      exitFullscreen()
    }
  }

  watch(isFullscreen, (value) => {
    if (typeof document === 'undefined') {
      return
    }

    document.body.style.overflow = value ? 'hidden' : ''

    if (value) {
      window.addEventListener('keydown', onKeydown)
      return
    }

    window.removeEventListener('keydown', onKeydown)
  })

  watch(() => resolvedDevice.value, (device) => {
    if (device !== 'pc' && isFullscreen.value) {
      exitFullscreen()
    }
  })

  return {
    isFullscreen,
    surfaceStyle,
    toggleFullscreen,
    exitFullscreen,
    onKeydown,
  }
}
