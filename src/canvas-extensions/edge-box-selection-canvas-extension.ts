import { Canvas, CanvasEdge } from "src/@types/Canvas"
import { BBox, Position } from "src/@types/Canvas"
import BBoxHelper from "src/utils/bbox-helper"
import CanvasExtension from "./canvas-extension"

const SAMPLE_STEPS = 20

export default class EdgeBoxSelectionCanvasExtension extends CanvasExtension {
  isEnabled() { return true as const }

  private dragStart: Position | null = null
  private altHeld: boolean = false

  init() {
    this.plugin.registerEvent(this.plugin.app.workspace.on(
      'advanced-canvas:canvas-changed',
      (canvas: Canvas) => this.setupListeners(canvas)
    ))
  }

  private setupListeners(canvas: Canvas) {
    const wrapperEl = canvas.wrapperEl
    if (!wrapperEl) return

    wrapperEl.addEventListener('pointerdown', (e: PointerEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('.canvas-node') || target.closest('.canvas-edge')) return
      this.altHeld = e.altKey
      this.dragStart = canvas.posFromClient({ x: e.clientX, y: e.clientY })
    })

    wrapperEl.addEventListener('pointerup', (e: PointerEvent) => {
      if (!this.dragStart) return

      const end = canvas.posFromClient({ x: e.clientX, y: e.clientY })
      const start = this.dragStart
      const wasAltHeld = this.altHeld
      this.dragStart = null
      this.altHeld = false

      const dx = Math.abs(end.x - start.x)
      const dy = Math.abs(end.y - start.y)
      if (dx < 5 && dy < 5) return
      if (!wasAltHeld) return

      const selectionBBox: BBox = {
        minX: Math.min(start.x, end.x),
        minY: Math.min(start.y, end.y),
        maxX: Math.max(start.x, end.x),
        maxY: Math.max(start.y, end.y),
      }

      this.selectEdgesInBBox(canvas, selectionBBox)
    })
  }

  private selectEdgesInBBox(canvas: Canvas, bbox: BBox) {
    const edgesToAdd: CanvasEdge[] = []

    for (const edge of canvas.edges.values()) {
      if (this.edgeIntersectsBBox(edge, bbox)) {
        edgesToAdd.push(edge)
      }
    }

    if (edgesToAdd.length === 0) return

    canvas.updateSelection(() => {
      for (const edge of edgesToAdd) {
        canvas.selection.add(edge)
      }
    })
  }

  private edgeIntersectsBBox(edge: CanvasEdge, bbox: BBox): boolean {
    const b = edge.bezier
    if (!b) return false

    const p0 = b.from
    const p1 = b.cp1
    const p2 = b.cp2
    const p3 = b.to

    for (let i = 0; i <= SAMPLE_STEPS; i++) {
      const t = i / SAMPLE_STEPS
      const pt = this.sampleCubicBezier(p0, p1, p2, p3, t)
      if (BBoxHelper.insideBBox(pt, bbox, true)) return true
    }

    return false
  }

  private sampleCubicBezier(p0: Position, p1: Position, p2: Position, p3: Position, t: number): Position {
    const u = 1 - t
    const uu = u * u
    const uuu = uu * u
    const tt = t * t
    const ttt = tt * t

    return {
      x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
      y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
    }
  }
}
