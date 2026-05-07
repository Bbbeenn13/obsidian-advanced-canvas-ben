import { Canvas, CanvasNode } from "src/@types/Canvas"
import CanvasHelper from "src/utils/canvas-helper"
import CanvasExtension from "./canvas-extension"

export default class NodeFootnoteCanvasExtension extends CanvasExtension {
  isEnabled() { return 'nodeFootnoteFeatureEnabled' as const }

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:popup-menu-created',
      (canvas: Canvas) => this.onPopupMenuCreated(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-added',
      (canvas: Canvas, node: CanvasNode) => this.renderFootnote(canvas, node)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-changed',
      (canvas: Canvas, node: CanvasNode) => this.renderFootnote(canvas, node)
    ))

    this.plugin.addCommand({
      id: 'edit-node-footnote',
      name: 'Edit/Add node footnote',
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas) => canvas.getSelectionData().nodes.length > 0,
        (canvas) => this.startEditingFootnote(canvas)
      )
    })
  }

  private onPopupMenuCreated(canvas: Canvas) {
    const selectedNodesData = canvas.getSelectionData().nodes
    if (canvas.readonly || selectedNodesData.length === 0) return

    const hasFootnote = selectedNodesData.some((nodeData: any) => nodeData.footnote)
    CanvasHelper.addPopupMenuOption(
      canvas,
      CanvasHelper.createPopupMenuOption({
        id: 'node-footnote',
        label: hasFootnote ? 'Edit footnote' : 'Add footnote',
        icon: 'text-cursor-input',
        callback: () => this.startEditingFootnote(canvas)
      })
    )
  }

  private startEditingFootnote(canvas: Canvas) {
    const selectedNodesData = canvas.getSelectionData().nodes
    if (selectedNodesData.length === 0) return

    const node = canvas.nodes.get(selectedNodesData[0].id)
    if (!node) return

    const nodeData = node.getData() as any
    const footnoteText = nodeData.footnote || ""

    let footnoteEl = node.nodeEl.querySelector('.ac-node-footnote') as HTMLElement | null
    if (!footnoteEl) {
      footnoteEl = document.createElement('div')
      footnoteEl.className = 'ac-node-footnote is-editing'
      footnoteEl.textContent = footnoteText
      node.nodeEl.appendChild(footnoteEl)
      this.createBorderElements(node)
    }

    this.setupEditing(canvas, node, footnoteEl, footnoteText)
  }

  private setupEditing(canvas: Canvas, node: CanvasNode, footnoteEl: HTMLElement, originalText: string) {
    footnoteEl.contentEditable = 'true'
    footnoteEl.classList.add('is-editing')
    footnoteEl.textContent = originalText
    footnoteEl.focus()

    const range = document.createRange()
    range.selectNodeContents(footnoteEl)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)

    const nodeData = node.getData() as any

    const saveFootnote = () => {
      footnoteEl.contentEditable = 'false'
      footnoteEl.classList.remove('is-editing')
      const newText = footnoteEl.textContent?.trim() || ""
      node.setData({
        ...nodeData,
        footnote: newText || undefined
      } as any)
      if (!newText) {
        footnoteEl.remove()
        node.nodeEl.querySelector('.ac-footnote-border-left')?.remove()
        node.nodeEl.querySelector('.ac-footnote-border-right')?.remove()
      }
      cleanup()
    }

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        footnoteEl.blur()
      }
      if (e.key === 'Escape') {
        footnoteEl.textContent = originalText
        footnoteEl.blur()
      }
    }

    const cleanup = () => {
      footnoteEl.removeEventListener('blur', saveFootnote)
      footnoteEl.removeEventListener('keydown', handleKeydown)
    }

    footnoteEl.addEventListener('blur', saveFootnote)
    footnoteEl.addEventListener('keydown', handleKeydown)
  }

  private renderFootnote(_canvas: Canvas, node: CanvasNode) {
    const nodeData = node.getData() as any
    const footnoteText = nodeData.footnote

    // Remove existing
    node.nodeEl.querySelector('.ac-node-footnote')?.remove()
    node.nodeEl.querySelector('.ac-footnote-border-left')?.remove()
    node.nodeEl.querySelector('.ac-footnote-border-right')?.remove()

    if (!footnoteText) return

    const footnoteEl = document.createElement('div')
    footnoteEl.className = 'ac-node-footnote'
    footnoteEl.textContent = footnoteText
    node.nodeEl.appendChild(footnoteEl)

    this.createBorderElements(node)
  }

  private createBorderElements(node: CanvasNode) {
    const leftBorder = document.createElement('div')
    leftBorder.className = 'ac-footnote-border-left'
    node.nodeEl.appendChild(leftBorder)

    const rightBorder = document.createElement('div')
    rightBorder.className = 'ac-footnote-border-right'
    node.nodeEl.appendChild(rightBorder)
  }
}
