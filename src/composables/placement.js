// 浮层定位：优先放在锚点下方，其次上方，水平方向夹在视口内（术语弹窗与导览卡片共用）
/**
 * @param {{ top, left, bottom, width }} rect 锚点矩形
 * @param {{ w: number, need: number, gap: number }} size 浮层宽度、所需高度、与锚点的间距
 * @param {{ w: number, h: number }} vp 视口尺寸
 * @param {{ align?: 'center'|'left', fallback?: 'top'|'bottom' }} opts 水平对齐；上下都放不下时贴视口顶部或底部
 */
export function placeNear(rect, { w, need, gap }, vp, { align = 'center', fallback = 'bottom' } = {}) {
  const x = align === 'center' ? rect.left + rect.width / 2 - w / 2 : rect.left;
  const left = Math.min(Math.max(12, x), vp.w - w - 12) + 'px';
  const width = w + 'px';
  if (vp.h - rect.bottom - gap >= need) return { top: rect.bottom + gap + 'px', left, width };
  if (rect.top - gap >= need) return { bottom: vp.h - rect.top + gap + 'px', left, width };
  // 视口太矮：贴边并限制高度，内容可滚动，保证完整可见
  return { [fallback]: '12px', left, width, maxHeight: `${vp.h - 24}px`, overflowY: 'auto' };
}
