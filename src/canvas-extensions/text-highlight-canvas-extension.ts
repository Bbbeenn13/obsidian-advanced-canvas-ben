import { EditorView, ViewPlugin, ViewUpdate, Decoration, DecorationSet } from '@codemirror/view'
import { EditorState, Range } from '@codemirror/state'
import { WidgetType } from '@codemirror/view'
import CanvasExtension from './canvas-extension'
import CanvasHelper from 'src/utils/canvas-helper'

// 空的不可见 widget 替换 ==
class HiddenMark extends WidgetType {
  toDOM() {
    const span = document.createElement('span')
    span.style.display = 'none'
    return span
  }
  ignoreEvent() { return true }
}

// CM6 ViewPlugin：隐藏 == 标记，给中间文字加黄色背景
const highlightPlugin = ViewPlugin.fromClass(class {
  decorations: DecorationSet

  constructor(view: EditorView) {
    this.decorations = buildDecorations(view)
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = buildDecorations(update.view)
    }
  }
}, { decorations: (v: any) => v.decorations })

function buildDecorations(view: EditorView): DecorationSet {
  const decorations: Range<Decoration>[] = []
  const doc = view.state.doc

  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i)
    const text = line.text
    let searchFrom = 0

    while (searchFrom < text.length) {
      const openIdx = text.indexOf('==', searchFrom)
      if (openIdx === -1) break

      const contentStart = openIdx + 2
      const closeIdx = text.indexOf('==', contentStart)
      if (closeIdx === -1) break

      // 跳过空的 == ==
      if (closeIdx === contentStart) {
        searchFrom = closeIdx + 2
        continue
      }

      const lineStart = line.from

      // 隐藏开头的 ==
      decorations.push(
        Decoration.replace({
          widget: new HiddenMark(),
        }).range(lineStart + openIdx, lineStart + contentStart)
      )

      // 给中间文字加高亮 class
      decorations.push(
        Decoration.mark({ class: 'ac-highlight' }).range(lineStart + contentStart, lineStart + closeIdx)
      )

      // 隐藏结尾的 ==
      decorations.push(
        Decoration.replace({
          widget: new HiddenMark(),
        }).range(lineStart + closeIdx, lineStart + closeIdx + 2)
      )

      searchFrom = closeIdx + 2
    }
  }

  return Decoration.set(decorations, true)
}

export default class TextHighlightCanvasExtension extends CanvasExtension {
  isEnabled() { return true as const }

  init() {
    // 注册 CM6 装饰器（全局生效）
    this.plugin.registerEditorExtension([highlightPlugin])

    // Alt+H 切换高亮
    this.plugin.addCommand({
      id: 'advanced-canvas:toggle-text-highlight',
      name: 'Toggle text highlight',
      hotkeys: [{ modifiers: ['Alt'], key: 'h' }],
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (_canvas) => true,
        (_canvas) => this.toggleHighlight()
      )
    })
  }

  private toggleHighlight() {
    const canvas = this.plugin.getCurrentCanvas()
    if (!canvas) return

    // 找到正在编辑的节点
    const node = Array.from(canvas.nodes.values()).find(n => n.isEditing)
    if (!node) return

    const cm = (node.child as any).editMode.cm as EditorView
    const sel = cm.state.selection.main
    if (!sel || sel.from === sel.to) return // 没有选中文字

    const from = sel.from
    const to = sel.to
    const selectedText = cm.state.sliceDoc(from, to)

    // 检查选区是否已在 ==...== 内
    const beforeText = cm.state.sliceDoc(Math.max(0, from - 2), from)
    const afterText = cm.state.sliceDoc(to, Math.min(cm.state.doc.length, to + 2))

    if (beforeText === '==' && afterText === '==') {
      // 移除高亮：删除前后的 ==
      cm.dispatch({
        changes: [
          { from: from - 2, to: from, insert: '' },
          { from: to, to: to + 2, insert: '' },
        ],
      })
    } else {
      // 添加高亮：包裹 ==
      cm.dispatch({
        changes: { from, to, insert: `==${selectedText}==` },
      })
    }
  }
}
