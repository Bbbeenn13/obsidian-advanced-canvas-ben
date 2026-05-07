import { ViewUpdate } from "@codemirror/view"
import { Canvas, CanvasNode } from "src/@types/Canvas"
import CanvasHelper from "src/utils/canvas-helper"
import CanvasExtension from "./canvas-extension"
import { CanvasFileNodeData, CanvasNodeData } from "src/@types/AdvancedJsonCanvas"

export default class AutoResizeNodeCanvasExtension  extends CanvasExtension {
  isEnabled() { return 'autoResizeNodeFeatureEnabled' as const }

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-created',
      (canvas: Canvas, node: CanvasNode) => this.onNodeCreated(canvas, node)
    ))

    this.plugin.addCommand({
      id: 'advanced-canvas:resize-all-nodes',
      name: 'Resize all auto-resize nodes',
      hotkeys: [
        {
          modifiers: ['Mod', 'Shift'],
          key: 'r'
        }
      ],
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => {
          return [...canvas.nodes.values()].some(n => (n.getData() as any).dynamicHeight)
        },
        (canvas: Canvas) => this.resizeAllNodes(canvas)
      )
    })

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-added',
      (canvas: Canvas, node: CanvasNode) => this.onNodeAdded(canvas, node)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:canvas-changed',
      (canvas: Canvas) => {
        setTimeout(() => this.resizeAllNodes(canvas), 800)
      }
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:popup-menu-created',
      (canvas: Canvas) => this.onPopupMenuCreated(canvas)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-editing-state-changed',
      (canvas: Canvas, node: CanvasNode, editing: boolean) => this.onNodeEditingStateChanged(canvas, node, editing)
    ))

    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-text-content-changed',
      (canvas: Canvas, node: CanvasNode, viewUpdate: ViewUpdate) => this.onNodeTextContentChanged(canvas, node, viewUpdate.view.dom)
    ))
  }

  private isValidNodeType(nodeData: CanvasNodeData) {
    return nodeData.type === 'text' || (nodeData.type === 'file' && (nodeData as CanvasFileNodeData).file.endsWith('.md'))
  }

  private onNodeCreated(_canvas: Canvas, node: CanvasNode) {
    const autoResizeNodeEnabledByDefault = this.plugin.settings.getSetting('autoResizeNodeEnabledByDefault')
    if (!autoResizeNodeEnabledByDefault) return

    const nodeData = node.getData()
    if (nodeData.type !== 'text' && nodeData.type !== 'file') return // File extension can still be changed in the future

    node.setData({
      ...node.getData(),
      dynamicHeight: true
    })
  }

  private onPopupMenuCreated(canvas: Canvas) {
    if (canvas.readonly) return

    const selectedNodes = canvas.getSelectionData().nodes
      .filter(nodeData => this.isValidNodeType(nodeData))
      .map(nodeData => canvas.nodes.get(nodeData.id))
      .filter(node => node !== undefined) as CanvasNode[]
    if (selectedNodes.length === 0) return

    const autoResizeHeightEnabled = selectedNodes.some(node => node.getData().dynamicHeight)

    CanvasHelper.addPopupMenuOption(
      canvas,
      CanvasHelper.createPopupMenuOption({
        id: 'auto-resize-height',
        label: autoResizeHeightEnabled ? 'Disable auto-resize' : 'Enable auto-resize',
        icon: autoResizeHeightEnabled ? 'scan-text' : 'lock',
        callback: () => this.toggleAutoResizeHeightEnabled(canvas, selectedNodes, autoResizeHeightEnabled)
      })
    )
  }

  private toggleAutoResizeHeightEnabled(canvas: Canvas, nodes: CanvasNode[], autoResizeHeight: boolean) {
    nodes.forEach(node => node.setData({
      ...node.getData(),
      dynamicHeight: !autoResizeHeight
    }))

    this.onPopupMenuCreated(canvas)
  }

  private canBeResized(node: CanvasNode) {
    const nodeData = node.getData()
    return nodeData.dynamicHeight
  }

  private async onNodeEditingStateChanged(_canvas: Canvas, node: CanvasNode, editing: boolean) {
    if (!this.isValidNodeType(node.getData())) return
    if (!this.canBeResized(node)) return

    await sleep(10)

    if (editing) {
      this.onNodeTextContentChanged(_canvas, node, node.child.editMode.cm.dom)
      return
    }

    const renderedMarkdownContainer = node.nodeEl.querySelector(".markdown-preview-view.markdown-rendered") as HTMLElement | null
    if (!renderedMarkdownContainer) return

    renderedMarkdownContainer.style.height = "min-content"
    const newHeight = renderedMarkdownContainer.clientHeight
    renderedMarkdownContainer.style.removeProperty("height")

    this.setNodeHeight(node, newHeight)
  }

  private async onNodeTextContentChanged(_canvas: Canvas, node: CanvasNode, dom: HTMLElement) {
    if (!this.isValidNodeType(node.getData())) return
    if (!this.canBeResized(node)) return

    const cmScroller = dom.querySelector(".cm-scroller") as HTMLElement | null
    if (!cmScroller) return

    cmScroller.style.height = "min-content"
    const newHeight = cmScroller.scrollHeight
    cmScroller.style.removeProperty("height")

    this.setNodeHeight(node, newHeight)
  }

  private setNodeHeight(node: CanvasNode, height: number) {
    if (height === 0) return

    // Add vertical padding (split evenly top/bottom by shifting y up)
    const padding = 30
    height += padding

    // Skip if height hasn't meaningfully changed
    const nodeData = node.getData()
    if (Math.abs(nodeData.height - height) < 3) return

    // Limit the height to the maximum allowed
    const maxHeight = this.plugin.settings.getSetting('autoResizeNodeMaxHeight')
    if (maxHeight != -1 && height > maxHeight) height = maxHeight

    height = Math.max(height, node.canvas.config.minContainerDimension)

    if (this.plugin.settings.getSetting('autoResizeNodeSnapToGrid'))
      height = Math.ceil(height / CanvasHelper.GRID_SIZE) * CanvasHelper.GRID_SIZE

    node.setData({
      ...nodeData,
      height: height
    })
  }

  private resizeAllNodes(canvas: Canvas) {
    const validNodes = [...canvas.nodes.values()].filter(
      node => this.isValidNodeType(node.getData())
    )

    // Measure and resize all in one pass (single setData per node)
    for (const node of validNodes) {
      const nodeData = node.getData() as any
      let contentHeight = 0

      // Try rendered view first (non-editing state)
      const renderedView = node.nodeEl.querySelector('.markdown-preview-view.markdown-rendered') as HTMLElement | null
      if (renderedView) {
        renderedView.style.height = "min-content"
        contentHeight = renderedView.clientHeight
        renderedView.style.removeProperty("height")
      }

      // Fall back to editor scroller (editing state)
      if (contentHeight === 0) {
        const cmScroller = node.nodeEl.querySelector('.cm-scroller') as HTMLElement | null
        if (cmScroller) {
          cmScroller.style.height = "min-content"
          contentHeight = cmScroller.scrollHeight
          cmScroller.style.removeProperty("height")
        }
      }

      if (contentHeight > 0) {
        const padding = 30
        contentHeight += padding

        // Skip if height hasn't meaningfully changed
        if (Math.abs(nodeData.height - contentHeight) < 3) continue

        const maxHeight = this.plugin.settings.getSetting('autoResizeNodeMaxHeight')
        if (maxHeight != -1 && contentHeight > maxHeight) contentHeight = maxHeight
        contentHeight = Math.max(contentHeight, node.canvas.config.minContainerDimension)

        node.setData({
          ...nodeData,
          dynamicHeight: true,
          height: contentHeight
        })
      } else if (!nodeData.dynamicHeight) {
        node.setData({ ...nodeData, dynamicHeight: true })
      }
    }
  }

  private onNodeAdded(canvas: Canvas, node: CanvasNode) {
    setTimeout(() => {
      const nodeData = node.getData() as any
      if (!nodeData.dynamicHeight) return

      let contentHeight = 0
      // Use min-content technique for accurate measurement
      const renderedView = node.nodeEl.querySelector('.markdown-preview-view.markdown-rendered') as HTMLElement | null
      if (renderedView) {
        renderedView.style.height = "min-content"
        contentHeight = renderedView.clientHeight
        renderedView.style.removeProperty("height")
      }

      if (contentHeight === 0) {
        const cmScroller = node.nodeEl.querySelector('.cm-scroller') as HTMLElement | null
        if (cmScroller) {
          cmScroller.style.height = "min-content"
          contentHeight = cmScroller.scrollHeight
          cmScroller.style.removeProperty("height")
        }
      }

      if (contentHeight > 0) this.setNodeHeight(node, contentHeight)
    }, 100)
  }
}
