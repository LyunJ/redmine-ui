import type { RedmineIssueDetail } from "../types/redmine";

/**
 * HTML 태그 제거
 */
function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent ?? "";
}

/**
 * 날짜 문자열(YYYY-MM-DD)을 YYYYMMDD로 변환
 */
function toDateParam(dateStr: string): string {
  return dateStr.replace(/-/g, "");
}

/**
 * 날짜 문자열에 1일 추가 (Google Calendar end date는 exclusive)
 */
function addOneDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

/**
 * 오늘 날짜를 YYYYMMDD로 반환
 */
function todayParam(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

/**
 * Google Calendar 이벤트 생성 URL 생성
 */
export function buildGoogleCalendarUrl(issue: RedmineIssueDetail): string {
  const title = `[#${issue.id}] ${issue.subject}`;

  const startDate = issue.start_date ? toDateParam(issue.start_date) : todayParam();
  const endDate = issue.due_date
    ? addOneDay(issue.due_date)
    : issue.start_date
      ? addOneDay(issue.start_date)
      : addOneDay(new Date().toISOString().slice(0, 10));

  // QR 코드 인식률을 위해 URL을 최대한 짧게 유지 (description 제외)
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${startDate}/${endDate}`,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * ICS 문자열에서 특수 문자 escape
 */
function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * RFC 5545 iCalendar 콘텐츠 생성
 */
export function generateIcsContent(issue: RedmineIssueDetail): string {
  const title = `[#${issue.id}] ${issue.subject}`;
  const today = todayParam();

  const startDate = issue.start_date ? toDateParam(issue.start_date) : today;
  const endDate = issue.due_date
    ? addOneDay(issue.due_date)
    : issue.start_date
      ? addOneDay(issue.start_date)
      : addOneDay(new Date().toISOString().slice(0, 10));

  let description = "";
  if (issue.description) {
    description = escapeIcs(stripHtml(issue.description).slice(0, 1000));
  }

  const uid = `redmine-issue-${issue.id}@redmine-ui`;
  const now = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Redmine UI//EN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART;VALUE=DATE:${startDate}`,
    `DTEND;VALUE=DATE:${endDate}`,
    `SUMMARY:${escapeIcs(title)}`,
    `DESCRIPTION:${description}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.join("\r\n");
}

/**
 * .ics 파일 다운로드
 */
export function downloadIcsFile(issue: RedmineIssueDetail): void {
  const content = generateIcsContent(issue);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `redmine-issue-${issue.id}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
