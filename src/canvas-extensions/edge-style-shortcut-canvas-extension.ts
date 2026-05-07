import { Canvas, CanvasEdge } from "src/@types/Canvas"
import CanvasHelper from "src/utils/canvas-helper"
import CanvasExtension from "./canvas-extension"

export default class EdgeStyleShortcutCanvasExtension extends CanvasExtension {
  isEnabled() { return 'edgeStyleShortcutFeatureEnabled' as const }

  init() {
    this.plugin.addCommand({
      id: 'advanced-canvas:toggle-edge-short-dashed',
      name: 'Toggle selected edges to short dashed',
      hotkeys: [
        {
          modifiers: ['Alt'],
          key: 'd'
        }
      ],
      checkCallback: CanvasHelper.canvasCommand(
        this.plugin,
        (canvas) => {
          const selectedEdges = [...canvas.selection].filter((item: any) => item.path !== undefined)
          return selectedEdges.length > 0
        },
        (canvas) => this.setEdgeStyleShortDashed(canvas)
      )
    })
  }

  private setEdgeStyleShortDashed(canvas: Canvas) {
    const selectedEdges = [...canvas.selection].filter((item: any) => item.path !== undefined) as CanvasEdge[]
    for (const edge of selectedEdges) {
      const edgeData = edge.getData()
      const isShortDashed = (edgeData as any).styleAttributes?.path === 'short-dashed'
      edge.setData({
        ...edgeData,
        styleAttributes: {
          ...(edgeData as any).styleAttributes,
          path: isShortDashed ? null : 'short-dashed'
        }
      } as any)
    }
    canvas.pushHistory(canvas.getData())
  }
}
