// 典籍内定位：按锚点列表（由具体到笼统）找到最合适的块
/**
 * @param {Array<{ t: string, text?: string }>} blocks 章节的块
 * @param {string[]} anchors 锚点，靠前的优先
 * @returns {number | null} 块序号
 */
export function findAnchorIndex(blocks, anchors) {
  if (!anchors || !blocks) return null;
  const items = blocks.map((b, i) => [b, i]);
  const hs = items.filter(([b]) => b.t === 'h');
  const ps = items.filter(([b]) => b.t === 'p' && typeof b.text === 'string');
  for (const a of anchors) {
    // 1. 完全相同的标题  2. 以锚点开头的标题（如“十一二月”）
    // 3. 以锚点开头的段落（《穷通宝鉴》甲乙木等月份小节是“正月甲木，……”“四月甲木退气……”这样的段落而非标题）
    // 一律从开头匹配、不用包含匹配，避免“二月丙火”误中“十二月丙火”；锚点由具体到笼统依次尝试
    const hit = hs.find(([b]) => b.text === a) || hs.find(([b]) => b.text.startsWith(a))
      || ps.find(([b]) => b.text.startsWith(a));
    if (hit) return hit[1];
  }
  return null;
}
