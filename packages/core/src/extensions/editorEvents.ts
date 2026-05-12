import type { Editor } from '@tiptap/core'

export type BambooEditorEventName = 'open-image-dialog' | 'open-video-dialog' | 'open-audio-dialog'

export interface BambooEditorEventPayloads {
  'open-image-dialog': {
    pos: number
    node: any
    mode: 'create' | 'edit'
    initialData: {
      src: string
      alt: string
      width: string | null
      height: string | null
      align: string
    }
  }
  'open-video-dialog': {
    pos: number
    node: any
    data: {
      src: string
      poster: string
      width: string | null
      height: string | null
      align: string
    }
  }
  'open-audio-dialog': {
    pos: number
    node: any
    mode: 'create' | 'edit'
    initialData: {
      src: string
      align: string
    }
  }
}

// Type-safe emit helper for editor custom events
export function emitEditorEvent<K extends BambooEditorEventName>(
  editor: Editor,
  event: K,
  payload: BambooEditorEventPayloads[K],
) {
  ;(editor as any).emit(event, payload)
}

// Type-safe on/off helpers for editor custom events
export function onEditorEvent<K extends BambooEditorEventName>(
  editor: Editor,
  event: K,
  handler: (payload: BambooEditorEventPayloads[K]) => void,
) {
  editor.on(event as any, handler)
}

export function offEditorEvent<K extends BambooEditorEventName>(
  editor: Editor,
  event: K,
  handler: (payload: BambooEditorEventPayloads[K]) => void,
) {
  editor.off(event as any, handler)
}
