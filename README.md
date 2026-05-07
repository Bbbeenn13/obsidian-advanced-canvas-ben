# Advanced Canvas_ben

> Personal fork of [Developer-Mike/obsidian-advanced-canvas](https://github.com/Developer-Mike/obsidian-advanced-canvas) with custom enhancements.

## What's different from the original

| Feature | Description | Shortcut |
|---------|-------------|----------|
| Quick Connect | Connect last selected node to all others with floating edges. Marching ants highlight on source node. | `Ctrl+Alt+C` |
| Auto Resize | Auto-enable dynamic height on all nodes. Resize all nodes at once on canvas open. | `Ctrl+Shift+R` |
| Auto Spacing | Push overlapping nodes apart with configurable minimum gap (default 50px). Runs on canvas open and after resize. | `Ctrl+Shift+S` |
| Edge Style Shortcut | Toggle short dashed style on selected edges | `Alt+D` |
| Node Footnote | Add/edit footnotes on nodes via popup menu | Command palette |
| Create Group | Group selected nodes into a container | `Ctrl+G` |
| Centered Text | All card content is center-aligned by default | Automatic |

## New Extensions

### Quick Connect (`quick-connect-canvas-extension.ts`)
- Tracks selection order across multiple selections
- Last selected node (shown with marching ants border) connects to all other selected nodes
- Auto-calculates optimal floating edge sides
- Skips duplicate edges with notice feedback

### Auto Resize (`auto-resize-node-canvas-extension.ts` enhancements)
- Auto-enables `dynamicHeight` on all valid nodes when canvas opens
- Uses `min-content` measurement technique for accurate content height
- 30px vertical padding, threshold-based stability (skip if delta < 3px)
- Runs on canvas open (800ms delay) to ensure DOM is rendered

### Auto Spacing (`auto-spacing-canvas-extension.ts`)
- Detects overlapping nodes using BBox collision detection
- Pushes nodes apart along the axis of least overlap (preserves layout direction)
- Iterative resolution with 20-iteration cap and re-entrance guard
- Excludes group nodes from being pushed

## Modified Files

| File | Change |
|------|--------|
| `src/canvas-extensions/quick-connect-canvas-extension.ts` | New |
| `src/canvas-extensions/auto-spacing-canvas-extension.ts` | New |
| `src/canvas-extensions/auto-resize-node-canvas-extension.ts` | Enhanced |
| `src/canvas-extensions/group-canvas-extension.ts` | Added Ctrl+G |
| `src/canvas-extensions/edge-style-shortcut-canvas-extension.ts` | New |
| `src/canvas-extensions/node-footnote-canvas-extension.ts` | New |
| `src/utils/bbox-helper.ts` | Added `getCenterOfBBox` |
| `src/settings.ts` | New settings for all features |
| `src/main.ts` | Registered new extensions |
| `src/styles/quick-connect.scss` | Marching ants + centered text |

## Original Features

All features from the original [Advanced Canvas](https://github.com/Developer-Mike/obsidian-advanced-canvas) plugin are included:

- Presentations, flowcharts, portals
- Node styles (shapes, borders, text alignment)
- Edge styles (path styles, arrows, pathfinding)
- Collapsible groups, focus mode, edge selection
- Custom CSS styles, canvas events
- And more...

See the [original README](https://github.com/Developer-Mike/obsidian-advanced-canvas) for full feature list.

## Credits

- Original plugin by [Developer-Mike](https://github.com/Developer-Mike)
- Custom enhancements by [Ben](https://github.com/Bbbeenn13)

## License

GPL-3.0 — Same as the [original project](https://github.com/Developer-Mike/obsidian-advanced-canvas/blob/main/LICENSE).
