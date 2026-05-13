import CodeBlock from '@tiptap/extension-code-block'
import type { EditorState } from '@tiptap/pm/state'
import type { Node as PMNode } from '@tiptap/pm/model'
import type { Transaction } from '@tiptap/pm/state'
import { TextSelection } from '@tiptap/pm/state'

/**
 * 获取选区内所有节点
 */
function findNodesInSelection(state: EditorState, nodeType: string): Array<{ node: PMNode; from: number; to: number }> {
  const nodes: Array<{ node: PMNode; from: number; to: number }> = []
  const { from, to } = state.selection

  state.doc.nodesBetween(from, to, (node, pos) => {
    if (node.type.name === nodeType) {
      nodes.push({ node, from: pos, to: pos + node.nodeSize })
    }
  })

  return nodes
}

/**
 * 获取选区内的顶层块级节点
 */
function findTopLevelBlocks(state: EditorState): Array<{ node: PMNode; from: number; to: number }> {
  const { from, to } = state.selection
  const blocks: Array<{ node: PMNode; from: number; to: number }> = []

  state.doc.nodesBetween(from, to, (node, pos) => {
    if (node.isBlock && node.type.name !== 'doc') {
      blocks.push({ node, from: pos, to: pos + node.nodeSize })
    }
  })

  // 过滤出顶层块（去掉嵌套在列表等内部的块）
  return blocks.filter(b => {
    return !blocks.some(other => other !== b && other.from < b.from && other.to > b.to)
  })
}

/**
 * 将选区内多个块合并为一个代码块
 */
function mergeBlocksIntoCodeBlock(tr: Transaction, state: EditorState): Transaction {
  const blocks = findTopLevelBlocks(state)

  if (blocks.length < 2) {
    return tr
  }

  blocks.sort((a, b) => a.from - b.from)

  let combinedText = ''
  for (let i = 0; i < blocks.length; i++) {
    const textContent = blocks[i].node.textContent
    if (i > 0) {
      combinedText += '\n'
    }
    combinedText += textContent
  }

  const firstFrom = blocks[0].from
  const lastTo = blocks[blocks.length - 1].to

  const schema = state.schema
  const codeBlockNode = schema.nodes.codeBlock.create(
    {},
    combinedText ? schema.text(combinedText) : undefined
  )

  tr = tr.delete(firstFrom, lastTo)
  tr = tr.insert(firstFrom, codeBlockNode)
  tr = tr.setSelection(TextSelection.near(tr.doc.resolve(firstFrom + 1), 1))

  return tr
}

/**
 * 写入剪贴板
 */
async function writeToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
    // 降级方案
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const result = document.execCommand('copy')
    document.body.removeChild(textarea)
    return result
  } catch {
    return false
  }
}

/**
 * 合并选区内的多个代码块为一个
 */
function mergeCodeBlocks(tr: Transaction, state: EditorState): Transaction {
  const codeBlocks = findNodesInSelection(state, 'codeBlock')

  if (codeBlocks.length < 2) {
    return tr
  }

  // 按位置排序
  codeBlocks.sort((a, b) => a.from - b.from)

  // 合并所有文本内容
  let combinedText = ''
  const language = codeBlocks[0].node.attrs.language || ''

  for (let i = 0; i < codeBlocks.length; i++) {
    const { node } = codeBlocks[i]
    const textContent = node.textContent
    if (i > 0) {
      combinedText += '\n'
    }
    combinedText += textContent
  }

  // 删除所有选中的代码块
  let deleteOffset = 0
  for (const { from, to, node } of codeBlocks) {
    const adjustedFrom = from - deleteOffset
    const adjustedTo = to - deleteOffset
    tr = tr.delete(adjustedFrom, adjustedTo)
    deleteOffset += node.nodeSize
  }

  // 在第一个代码块的位置插入新代码块
  const insertPos = codeBlocks[0].from
  const schema = state.schema
  const codeBlockNode = schema.nodes.codeBlock.create(
    { language },
    combinedText ? schema.text(combinedText) : undefined
  )

  tr = tr.insert(insertPos, codeBlockNode)

  // 设置选区到新代码块内
  const resolvedPos = tr.doc.resolve(insertPos + 1)
  tr = tr.setSelection(TextSelection.near(resolvedPos, 1))

  return tr
}

export const CleanCodeBlock = CodeBlock.extend({
  addCommands() {
    return {
      ...this.parent?.(),

      /**
       * 切换代码块，如果选区内有多个代码块则合并它们
       */
      toggleCodeBlock: (attributes) => ({ state, dispatch, commands }) => {
        const codeBlocks = findNodesInSelection(state, 'codeBlock')

        // 如果选区内有多个代码块，合并它们
        if (codeBlocks.length > 1) {
          if (!dispatch) {
            return true
          }

          const tr = mergeCodeBlocks(state.tr, state)
          dispatch(tr.scrollIntoView())
          return true
        }

        // 检查选区内有多个块级节点（如段落等）
        const blocks = findTopLevelBlocks(state)
        if (blocks.length > 1) {
          if (!dispatch) {
            return true
          }

          const tr = mergeBlocksIntoCodeBlock(state.tr, state)
          dispatch(tr.scrollIntoView())
          return true
        }

        // 否则调用默认的 toggleCodeBlock
        return commands.toggleNode(this.name, 'paragraph', attributes)
      },
    }
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      // 外层 pre（与 renderHTML 的节点类型一致）
      const dom = document.createElement('pre')
      dom.className = 'code-block-wrapper'

      // code 子节点（ProseMirror 会将文本内容渲染到这里）
      const contentDOM = document.createElement('code')
      dom.appendChild(contentDOM)

      // 复制按钮（浮在 pre 上方）
      const copyBtn = document.createElement('button')
      copyBtn.className = 'code-copy-button'
      copyBtn.type = 'button'
      copyBtn.setAttribute('aria-label', '复制代码')
      copyBtn.title = '复制代码'
      // 复制图标 SVG
      copyBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      `

      copyBtn.addEventListener('click', async (e) => {
        e.preventDefault()
        e.stopPropagation()

        const text = node.textContent
        const success = await writeToClipboard(text)

        if (success) {
          // 显示成功图标
          copyBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          `
          setTimeout(() => {
            copyBtn.innerHTML = `
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            `
          }, 2000)
        }
      })

      dom.appendChild(copyBtn)

      return { dom, contentDOM }
    }
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = Object.fromEntries(Object.entries(HTMLAttributes).filter(([key]) => key === 'data-language'))

    return ['pre', ['code', attrs, 0]]
  },
})
