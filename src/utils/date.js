/** 两位补零 */
export const pad = n => String(n).padStart(2, '0');

/** “YYYY-MM-DD”（可直接按字符串比较先后） */
export const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

/** “YYYY-MM-DD HH:MM”（交运时刻与当前时刻共用此格式，按字符串比较先后） */
export const ymdhm = t => `${ymd(t.year, t.month, t.day)} ${pad(t.hour)}:${pad(t.minute)}`;

/** “1993年1月4日 14:00” */
export const formatDateTime = t => `${t.year}年${t.month}月${t.day}日 ${pad(t.hour)}:${pad(t.minute)}`;
