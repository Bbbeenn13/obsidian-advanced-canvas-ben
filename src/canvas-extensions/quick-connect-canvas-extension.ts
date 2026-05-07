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
        this.updateSourceHint(canvas)
      }
    ))

    // Register as a command — user can bind any hotkey via Obsidian Settings > Hotkeys
    this.plugin.addCommand({
      id: 'advanced-canvas:connect-selected-nodes',
      name: 'Connect selected nodes (last selected → all others)',
      hotkeys: [
        {
          modifiers: ['Mod', 'Alt'],
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

    const sourceId = nodeIds[nodeIds.length - 1] // Last selected = source
    const sourceNode = canvas.nodes.get(sourceId)!
    const targetIds = nodeIds.slice(0, -1) // All others = targets

    const existingEdges = Array.from(canvas.edges.values())
    const newEdges: CanvasEdgeData[] = []
    let skipped = 0

    for (const targetId of targetIds) {
      const isDuplicate = existingEdges.some(
        e => e.getData().fromNode === sourceId && e.getData().toNode === targetId
      ) || newEdges.some(e => e.toNode === targetId)
      if (isDuplicate) { skipped++; continue }

      const targetNode = canvas.nodes.get(targetId)!

      const sourceCenter = BBoxHelper.getCenterOfBBox(sourceNode.getBBox())
      const targetCenter = BBoxHelper.getCenterOfBBox(targetNode.getBBox())

      newEdges.push({
        id: this.generateId(),
        fromNode: sourceId,
        fromSide: CanvasHelper.getBestSideForFloatingEdge(targetCenter, sourceNode),
        fromFloating: true,
        toNode: targetId,
        toSide: CanvasHelper.getBestSideForFloatingEdge(sourceCenter, targetNode),
        toFloating: true,
      })
    }

    if (newEdges.length === 0) {
      new Notice('All edges already exist')
      return
    }

    canvas.importData({ nodes: [], edges: newEdges }, false, false)
    canvas.pushHistory(canvas.getData())

    const msg = skipped > 0
      ? `${newEdges.length} edge(s) created, ${skipped} skipped (already exist)`
      : `${newEdges.length} edge(s) created`
    new Notice(msg)
  }

  private generateId(): string {
    const chars = '0123456789abcdef'
    let id = ''
    for (let i = 0; i < 16; i++) id += chars[Math.floor(Math.random() * 16)]
    return id
  }

  private updateSourceHint(canvas: Canvas) {
    // Remove existing hints
    canvas.wrapperEl.querySelectorAll('.ac-marching-ants').forEach(el => el.remove())

    // Add hint to last selected node when 2+ nodes are selected
    if (this.selectionOrder.length < 2) return
    const sourceId = this.selectionOrder[this.selectionOrder.length - 1]
    const sourceNode = canvas.nodes.get(sourceId)
    if (!sourceNode) return

    const nodeData = sourceNode.getData()
    const padding = 13
    const w = nodeData.width + padding * 2
    const h = nodeData.height + padding * 2
    const r = 12

    const ns = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(ns, 'svg')
    svg.classList.add('ac-marching-ants')
    svg.setAttribute('width', String(w))
    svg.setAttribute('height', String(h))
    svg.style.cssText = `position:absolute;top:-${padding}px;left:-${padding}px;width:${w}px;height:${h}px;pointer-events:none;z-index:10;`

    const rect = document.createElementNS(ns, 'rect')
    rect.setAttribute('x', '1')
    rect.setAttribute('y', '1')
    rect.setAttribute('width', String(w - 2))
    rect.setAttribute('height', String(h - 2))
    rect.setAttribute('rx', String(r))
    rect.setAttribute('ry', String(r))
    rect.setAttribute('fill', 'none')
    rect.setAttribute('stroke', 'rgba(100, 200, 120, 0.8)')
    rect.setAttribute('stroke-width', '2')
    rect.setAttribute('stroke-dasharray', '8 4')

    const animate = document.createElementNS(ns, 'animate')
    animate.setAttribute('attributeName', 'stroke-dashoffset')
    animate.setAttribute('from', '0')
    animate.setAttribute('to', '-24')
    animate.setAttribute('dur', '0.6s')
    animate.setAttribute('repeatCount', 'indefinite')

    rect.appendChild(animate)
    svg.appendChild(rect)
    sourceNode.nodeEl.appendChild(svg)
  }
}
