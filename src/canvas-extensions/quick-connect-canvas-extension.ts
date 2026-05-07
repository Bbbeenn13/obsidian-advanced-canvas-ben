import { Notice } from "obsidian"
import { Canvas, CanvasElement, CanvasNode } from "src/@types/Canvas"
import { CanvasEdgeData } from "src/@types/AdvancedJsonCanvas"
import BBoxHelper from "src/utils/bbox-helper"
import CanvasHelper from "src/utils/canvas-helper"
import CanvasExtension from "./canvas-extension"

export default class QuickConnectCanvasExtension extends CanvasExtension {
  isEnabled() { return true }

  private selectionOrder: string[] = []

  init() {
    // Track selection order via advanced-canvas:selection-changed
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:selection-changed',
      (canvas: Canvas, _oldSelection: Set<CanvasElement>, _updateSelection: (fn: () => void) => void) => {
        this.syncSelectionOrder(canvas)
      }
    ))

    // Register as a command — user can bind any hotkey via Obsidian Settings > Hotkeys
    this.plugin.addCommand({
      id: 'advanced-canvas:connect-selected-nodes',
      name: 'Connect selected nodes (last selected → first selected)',
      hotkeys: [
        {
          modifiers: ['Alt'],
          key: 'c'
        }
      ],
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas) => {
          this.syncSelectionOrder(canvas)
          return this.selectionOrder.length >= 2
        },
        (canvas) => this.connectSelection()
      )
    })
  }

  private syncSelectionOrder(canvas: Canvas) {
    const currentIds = new Set<string>()
    for (const item of canvas.selection) {
      if (item.id && canvas.nodes.has(item.id)) {
        currentIds.add(item.id)
      }
    }

    // Remove deselected nodes, preserve order
    this.selectionOrder = this.selectionOrder.filter(id => currentIds.has(id))
    // Append newly selected nodes
    for (const id of currentIds) {
      if (!this.selectionOrder.includes(id)) {
        this.selectionOrder.push(id)
      }
    }
  }

  private connectSelection() {
    const canvas = this.plugin.getCurrentCanvas()
    if (!canvas) return

    this.syncSelectionOrder(canvas)

    const nodeIds = this.selectionOrder.filter(id => canvas.nodes.has(id))
    if (nodeIds.length < 2) {
      new Notice('Please select at least 2 cards')
      return
    }

    const fromId = nodeIds[nodeIds.length - 1] // Last selected = source
    const toId = nodeIds[0] // First selected = target

    const fromNode = canvas.nodes.get(fromId)!
    const toNode = canvas.nodes.get(toId)!

    // Check duplicate
    const existingEdge = Array.from(canvas.edges.values()).find(
      e => e.getData().fromNode === fromId && e.getData().toNode === toId
    )
    if (existingEdge) {
      new Notice('Edge already exists')
      return
    }

    // Calculate optimal sides
    const fromCenter = BBoxHelper.getCenterOfBBox(fromNode.getBBox())
    const toCenter = BBoxHelper.getCenterOfBBox(toNode.getBBox())

    const fromSide = CanvasHelper.getBestSideForFloatingEdge(toCenter, fromNode)
    const toSide = CanvasHelper.getBestSideForFloatingEdge(fromCenter, toNode)

    const edgeId = this.generateId()
    const edge: CanvasEdgeData = {
      id: edgeId,
      fromNode: fromId,
      fromSide,
      fromFloating: true,
      toNode: toId,
      toSide,
      toFloating: true,
    }

    // Add edge using importData (same pattern as auto-file-node-edges)
    canvas.importData({ nodes: [], edges: [edge] }, false, false)
    canvas.pushHistory(canvas.getData())

    new Notice('Edge created')
  }

  private generateId(): string {
    const chars = '0123456789abcdef'
    let id = ''
    for (let i = 0; i < 16; i++) id += chars[Math.floor(Math.random() * 16)]
    return id
  }
}
