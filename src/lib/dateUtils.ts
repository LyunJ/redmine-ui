/**
 * start_date ~ due_date 범위에서 오늘의 위치를 0~1 비율로 계산.
 * 날짜가 없으면 null 반환.
 */
export function calcProgress(
  startDate: string | null,
  dueDate: string | null,
): number | null {
  if (!startDate || !dueDate) return null;

  const start = new Date(startDate).getTime();
  const due = new Date(dueDate).getTime();
  const now = Date.now();

  if (due <= start) return now >= due ? 1 : 0;

  const ratio = (now - start) / (due - start);
  return Math.max(0, ratio); // 1 초과 허용 (기한 초과 표시용)
}

/**
 * 날짜를 YYYY-MM-DD 형식으로 포맷.
 */
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return dateStr.slice(0, 10);
}
