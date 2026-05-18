# DEVLOG - obsidian-advanced-canvas-ben

> Development log for personal fork of [obsidian-advanced-canvas](https://github.com/Developer-Mike/obsidian-advanced-canvas)

---

## 2026-05-07

### Quick Connect (快速连线)
- **文件**: `src/canvas-extensions/quick-connect-canvas-extension.ts`
- 功能：多选卡片后，最后选中的卡片自动连线到其他所有卡片
- 快捷键：`Ctrl+Alt+C`
- 追踪选择顺序，最后选中的卡片用 SVG 蚂蚁线动画高亮显示
- 蚂蚁线：SVG `<rect>` + `<animate stroke-dashoffset>`，淡绿色，8px 圆角
- 自动计算最优浮动边方向，跳过重复连线

### Auto Resize (自动调整高度)
- **文件**: `src/canvas-extensions/auto-resize-node-canvas-extension.ts`
- 功能：所有节点自动启用 `dynamicHeight`，打开 canvas 时自动调整高度
- 快捷键：`Ctrl+Shift+R` 手动触发全部重调
- 使用 `min-content` 测量技术获取准确内容高度
- 30px 垂直 padding，3px 阈值跳过微小变化
- canvas 打开后 800ms 延迟执行，确保 DOM 已渲染
- `onNodeAdded` 仅标记 `dynamicHeight: true`，不触发 resize（避免跳动）

### Auto Spacing (自动间距)
- **文件**: `src/canvas-extensions/auto-spacing-canvas-extension.ts`
- 功能：检测重叠节点并沿最小重叠轴推开
- 快捷键：`Ctrl+Shift+S`
- 默认 50px 间隙，最多 20 次迭代，`WeakSet` 防重入
- canvas 打开后 1200ms 延迟执行（在 auto-resize 之后）

### Edge Style Shortcut (边样式快捷键)
- **文件**: `src/canvas-extensions/edge-style-shortcut-canvas-extension.ts`
- 快捷键：`Alt+D` 切换选中连线的短虚线样式

### Edge Marching Ants (连线蚂蚁线动画)
- **文件**: `src/styles/edge-styles.scss`
- 短虚线和长虚线连线添加流动蚂蚁线动画
- CSS `@keyframes edge-march` 动画 `stroke-dashoffset: -24`

### Node Footnote (节点脚注)
- **文件**: `src/canvas-extensions/node-footnote-canvas-extension.ts`
- 通过弹出菜单添加/编辑节点脚注

### Group (分组)
- 快捷键：`Ctrl+G` 创建分组

### Centered Text (文字居中)
- **文件**: `src/styles/quick-connect.scss`
- 所有卡片内容默认居中对齐

---

## 2026-05-08

### Edge Box Selection (框选连线)
- **文件**: `src/canvas-extensions/edge-box-selection-canvas-extension.ts`
- 功能：按住 `Alt` + 框选可选中连线
- 对贝塞尔曲线采样 20 个点检测是否在选择框内
- 不按 Alt 时普通框选行为不变（只选节点）
- **样式**: `src/styles/edge-box-selection.scss`
  - 选框圆角 8px
  - 透明度降至 0.4，降低视觉干扰
