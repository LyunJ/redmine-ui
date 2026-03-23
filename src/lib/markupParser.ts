/**
 * Redmine Textile/HTML 마크업을 안전한 HTML로 변환.
 * DOMParser로 파싱하여 허용된 태그만 남기고 나머지는 제거.
 */

const ALLOWED_TAGS = new Set([
  "P", "BR", "B", "STRONG", "I", "EM", "U", "S", "DEL",
  "H1", "H2", "H3", "H4",
  "UL", "OL", "LI",
  "PRE", "CODE", "BLOCKQUOTE",
  "TABLE", "THEAD", "TBODY", "TR", "TH", "TD",
  "A", "HR", "IMG",
]);

function sanitizeNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeHtml(node.textContent ?? "");
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as Element;
  const tag = el.tagName;

  // 허용된 태그가 아니면 자식만 출력
  if (!ALLOWED_TAGS.has(tag)) {
    return Array.from(el.childNodes).map(sanitizeNode).join("");
  }

  const children = Array.from(el.childNodes).map(sanitizeNode).join("");

  // A 태그는 href만 허용
  if (tag === "A") {
    const href = el.getAttribute("href") ?? "#";
    return `<a href="${escapeAttr(href)}" target="_blank" rel="noopener">${children}</a>`;
  }

  // IMG 태그는 src, alt만 허용. data-original-src에 원본 URL 저장
  if (tag === "IMG") {
    const src = el.getAttribute("src") ?? "";
    const alt = el.getAttribute("alt") ?? "";
    return `<img data-original-src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" class="markup-image" />`;
  }

  const tagLower = tag.toLowerCase();
  if (["br", "hr"].includes(tagLower)) {
    return `<${tagLower} />`;
  }

  return `<${tagLower}>${children}</${tagLower}>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(text: string): string {
  return text.replace(/"/g, "&quot;");
}

/**
 * Textile 기본 문법을 HTML로 변환 (Redmine에서 Textile 원본이 올 경우).
 */
function textileToHtml(text: string): string {
  let html = text;

  // 제목: h1. ~ h4.
  html = html.replace(/^h([1-4])\.\s+(.+)$/gm, "<h$1>$2</h$1>");

  // 굵게: *text*
  html = html.replace(/\*([^\*\n]+)\*/g, "<strong>$1</strong>");

  // 기울임: _text_
  html = html.replace(/_([^_\n]+)_/g, "<em>$1</em>");

  // 취소선: -text-
  html = html.replace(/-([^\-\n]+)-/g, "<del>$1</del>");

  // 밑줄: +text+
  html = html.replace(/\+([^\+\n]+)\+/g, "<u>$1</u>");

  // 인라인 코드: @text@
  html = html.replace(/@([^@\n]+)@/g, "<code>$1</code>");

  // 코드 블록: <pre>...</pre> 은 그대로 유지
  // 링크: "text":url
  html = html.replace(/"([^"]+)":(\S+)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // 이미지: !url! 또는 !url(alt text)!
  html = html.replace(/!([^\s!]+?)(?:\(([^)]*)\))?!/g, '<img src="$1" alt="$2" />');

  // 순서 없는 목록: * item
  html = html.replace(/^(\*+)\s+(.+)$/gm, (_match, stars: string, content: string) => {
    const depth = stars.length;
    return `<li data-depth="${depth}">${content}</li>`;
  });

  // 순서 있는 목록: # item
  html = html.replace(/^(#+)\s+(.+)$/gm, (_match, hashes: string, content: string) => {
    const depth = hashes.length;
    return `<li data-depth="${depth}" data-ordered="true">${content}</li>`;
  });

  // 줄바꿈 -> <br> (빈 줄은 단락 구분)
  html = html.replace(/\n\n+/g, "</p><p>");
  html = html.replace(/\n/g, "<br />");
  html = `<p>${html}</p>`;

  // 빈 <p> 제거
  html = html.replace(/<p>\s*<\/p>/g, "");

  return html;
}

/**
 * Redmine 마크업 문자열을 안전한 HTML로 변환.
 */
export function parseRedmineMarkup(raw: string): string {
  if (!raw || !raw.trim()) return "";

  // HTML 태그가 이미 포함되어 있는지 확인
  const hasHtmlTags = /<[a-zA-Z][^>]*>/.test(raw);

  let html: string;
  if (hasHtmlTags) {
    // 이미 HTML인 경우 그대로 사용
    html = raw;
  } else {
    // Textile로 간주하여 변환
    html = textileToHtml(raw);
  }

  // DOMParser로 안전하게 파싱
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  return Array.from(doc.body.childNodes).map(sanitizeNode).join("");
}
