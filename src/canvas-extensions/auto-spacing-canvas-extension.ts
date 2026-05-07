import { Canvas, CanvasNode } from "src/@types/Canvas"
import BBoxHelper from "src/utils/bbox-helper"
import CanvasHelper from "src/utils/canvas-helper"
import CanvasExtension from "./canvas-extension"

const MAX_ITERATIONS = 20

export default class AutoSpacingCanvasExtension extends CanvasExtension {
  isEnabled() { return 'autoSpacingFeatureEnabled' as const }

  private resolving: WeakSet<Canvas> = new WeakSet()

  init() {
    // After canvas loads (double rAF to run after auto-resize)
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:canvas-changed',
      (canvas: Canvas) => {
        setTimeout(() => this.resolveSpacing(canvas), 1200)
      }
    ))

    // After node resize
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:node-resized',
      (canvas: Canvas) => {
        requestAnimationFrame(() => this.resolveSpacing(canvas))
      }
    ))

    // Manual command
    this.plugin.addCommand({
      id: 'advanced-canvas:resolve-spacing',
      name: 'Resolve node spacing (push overlapping nodes apart)',
      hotkeys: [
        {
          modifiers: ['Mod', 'Shift'],
          key: 's'
        }
      ],
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas: Canvas) => canvas.nodes.size > 1,
        (canvas: Canvas) => this.resolveSpacing(canvas)
      )
    })
  }

  private resolveSpacing(canvas: Canvas) {
    if (this.resolving.has(canvas)) return
    if ((canvas as any).isDragging) return

    this.resolving.add(canvas)
    try {
      // Exclude group nodes — they are containers, not pushable
      const nodes = [...canvas.nodes.values()].filter(n => n.getData().type !== 'group')
      const gap = this.plugin.settings.getSetting('autoSpacingMinimumGap')

      for (let i = 0; i < MAX_ITERATIONS; i++) {
        if (!this.resolveOneIteration(canvas, nodes, gap)) break
      }

      canvas.pushHistory(canvas.getData())
    } finally {
      this.resolving.delete(canvas)
    }
  }

  private resolveOneIteration(_canvas: Canvas, nodes: CanvasNode[], gap: number): boolean {
    const displacements = new Map<string, { dx: number; dy: number }>()
    for (const node of nodes) displacements.set(node.getData().id, { dx: 0, dy: 0 })

    let hadCollision = false

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]
        const b = nodes[j]

        const bboxA = BBoxHelper.enlargeBBox(this.nodeToBBox(a), gap / 2)
        const bboxB = BBoxHelper.enlargeBBox(this.nodeToBBox(b), gap / 2)

        if (!BBoxHelper.isColliding(bboxA, bboxB)) continue
        hadCollision = true

        const overlapX = Math.min(bboxA.maxX, bboxB.maxX) - Math.max(bboxA.minX, bboxB.minX)
        const overlapY = Math.min(bboxA.maxY, bboxB.maxY) - Math.max(bboxA.minY, bboxB.minY)

        if (overlapX <= 0 || overlapY <= 0) continue

        const centerA = BBoxHelper.getCenterOfBBox(this.nodeToBBox(a))
        const centerB = BBoxHelper.getCenterOfBBox(this.nodeToBBox(b))

        const idA = a.getData().id
        const idB = b.getData().id
        const dA = displacements.get(idA)!
        const dB = displacements.get(idB)!

        if (overlapX < overlapY) {
          const sign = centerB.x >= centerA.x ? 1 : -1
          const push = overlapX / 2 + 0.5
          dA.dx -= push * sign
          dB.dx += push * sign
        } else {
          const sign = centerB.y >= centerA.y ? 1 : -1
          const push = overlapY / 2 + 0.5
          dA.dy -= push * sign
          dB.dy += push * sign
        }
      }
    }

    if (!hadCollision) return false

    for (const node of nodes) {
      const d = displacements.get(node.getData().id)!
      if (d.dx !== 0 || d.dy !== 0) {
        const nodeData = node.getData()
        node.setData({
          ...nodeData,
          x: nodeData.x + d.dx,
          y: nodeData.y + d.dy
        })
      }
    }

    return true
  }

  private nodeToBBox(node: CanvasNode) {
    const data = node.getData()
    return {
      minX: data.x,
      minY: data.y,
      maxX: data.x + data.width,
      maxY: data.y + data.height
    }
  }
}
