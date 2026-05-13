/**
 * Redmine Textile/HTML 마크업을 안전한 HTML로 변환.
 * 블록 단위 파서 + 허용된 태그만 남기는 sanitizer 2단계로 구성.
 *
 * 지원 Textile:
 *   - h1. ~ h6.
 *   - bq. 인용
 *   - bc. 코드 블록 (빈 줄까지)
 *   - <pre>...</pre> 다중 라인 코드
 *   - *굵게* _기울임_ +밑줄+ -취소선- @코드@
 *   - "text":url 링크
 *   - !url! / !url(alt)! 이미지
 *   - * / # 중첩 리스트
 *   - |_. header |  | cell |  테이블 (정렬 <./>./=., 병합 /N. \N.)
 *   - --- 수평선
 */

const ALLOWED_TAGS = new Set([
  "P", "BR", "B", "STRONG", "I", "EM", "U", "S", "DEL", "STRIKE",
  "H1", "H2", "H3", "H4", "H5", "H6",
  "UL", "OL", "LI",
  "PRE", "CODE", "BLOCKQUOTE",
  "TABLE", "THEAD", "TBODY", "TR", "TH", "TD",
  "A", "HR", "IMG", "SPAN", "DIV",
]);

const ALIGN_CLASS: Record<string, string> = {
  left: "align-left",
  right: "align-right",
  center: "align-center",
};

function sanitizeNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeHtml(node.textContent ?? "");
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as Element;
  const tag = el.tagName;

  if (!ALLOWED_TAGS.has(tag)) {
    return Array.from(el.childNodes).map(sanitizeNode).join("");
  }

  const children = Array.from(el.childNodes).map(sanitizeNode).join("");

  if (tag === "A") {
    const href = el.getAttribute("href") ?? "#";
    return `<a href="${escapeAttr(href)}" target="_blank" rel="noopener">${children}</a>`;
  }

  if (tag === "IMG") {
    const src = el.getAttribute("src") ?? "";
    const alt = el.getAttribute("alt") ?? "";
    return `<img data-original-src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" class="markup-image" />`;
  }

  if (tag === "TD" || tag === "TH") {
    const attrs: string[] = [];
    const align = el.getAttribute("data-align");
    const colspan = el.getAttribute("colspan");
    const rowspan = el.getAttribute("rowspan");
    if (align && ALIGN_CLASS[align]) attrs.push(`class="${ALIGN_CLASS[align]}"`);
    if (colspan) attrs.push(`colspan="${escapeAttr(colspan)}"`);
    if (rowspan) attrs.push(`rowspan="${escapeAttr(rowspan)}"`);
    const attrStr = attrs.length ? " " + attrs.join(" ") : "";
    return `<${tag.toLowerCase()}${attrStr}>${children}</${tag.toLowerCase()}>`;
  }

  const tagLower = tag.toLowerCase();
  if (tagLower === "br" || tagLower === "hr") return `<${tagLower} />`;

  return `<${tagLower}>${children}</${tagLower}>`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(text: string): string {
  return text.replace(/"/g, "&quot;");
}

/** 인라인 Textile 마크업만 HTML로 변환. 블록 파서가 라인별 내용에 대해 호출한다. */
function inlineTextile(text: string): string {
  let html = text;

  // 이미지: !url! / !url(alt)! — 링크 변환 전에 먼저 (URL 안의 : 충돌 방지)
  html = html.replace(/!([^\s!]+?)(?:\(([^)]*)\))?!/g, (_m, src: string, alt?: string) => {
    const altAttr = alt ? ` alt="${escapeAttr(alt)}"` : ` alt=""`;
    return `<img data-original-src="${escapeAttr(src)}"${altAttr} class="markup-image" />`;
  });

  // 링크: "text":url — URL은 공백/" / < 까지
  html = html.replace(/"([^"]+)":(\S+?)(?=[\s<"]|$)/g, (_m, label: string, url: string) => {
    return `<a href="${escapeAttr(url)}" target="_blank" rel="noopener">${label}</a>`;
  });

  // 인라인 코드: @text@
  html = html.replace(/@([^@\n]+)@/g, (_m, s: string) => `<code>${s}</code>`);

  // 굵게: *text* — 단어 경계를 고려하여 단순하게 처리
  html = html.replace(/(^|[^\w*])\*([^\*\n]+?)\*(?=[^\w*]|$)/g, "$1<strong>$2</strong>");

  // 기울임: _text_
  html = html.replace(/(^|[^\w_])_([^_\n]+?)_(?=[^\w_]|$)/g, "$1<em>$2</em>");

  // 밑줄: +text+
  html = html.replace(/(^|[^\w+])\+([^\+\n]+?)\+(?=[^\w+]|$)/g, "$1<u>$2</u>");

  // 취소선: -text-
  html = html.replace(/(^|[^\w-])-([^\-\n]+?)-(?=[^\w-]|$)/g, "$1<del>$2</del>");

  return html;
}

/** |_>./2\\2. 같은 셀 수정자 구문 파싱. content 문자열에서 선행 수정자를 뜯어낸다. */
function parseCellModifiers(raw: string): {
  tag: "th" | "td";
  align?: "left" | "right" | "center";
  colspan?: number;
  rowspan?: number;
  content: string;
} {
  let tag: "th" | "td" = "td";
  let align: "left" | "right" | "center" | undefined;
  let colspan: number | undefined;
  let rowspan: number | undefined;
  let content = raw;

  // 수정자는 cell 시작 부분에 있고 '.' + 공백 1칸으로 종료
  const match = content.match(/^((?:_|<|>|=|\\\d+|\/\d+)+)\.\s?/);
  if (match) {
    const mods = match[1];
    const re = /_|<|>|=|\\\d+|\/\d+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(mods))) {
      const token = m[0];
      if (token === "_") tag = "th";
      else if (token === "<") align = "left";
      else if (token === ">") align = "right";
      else if (token === "=") align = "center";
      else if (token.startsWith("\\")) colspan = parseInt(token.slice(1), 10);
      else if (token.startsWith("/")) rowspan = parseInt(token.slice(1), 10);
    }
    content = content.slice(match[0].length);
  }

  return { tag, align, colspan, rowspan, content };
}

/** 테이블 행 파싱. `|_. h |_. h |` → TR HTML */
function parseTableRow(line: string): string {
  // 앞뒤 '|' 제거 후 내부 '|'로 분할. 셀 내부의 '|' 이스케이프는 Redmine에서 미지원이므로 단순 split.
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells = trimmed.split("|");
  const tds = cells.map((raw) => {
    const { tag, align, colspan, rowspan, content } = parseCellModifiers(raw);
    const attrs: string[] = [];
    if (align) attrs.push(`data-align="${align}"`);
    if (colspan && colspan > 1) attrs.push(`colspan="${colspan}"`);
    if (rowspan && rowspan > 1) attrs.push(`rowspan="${rowspan}"`);
    const attrStr = attrs.length ? " " + attrs.join(" ") : "";
    const inner = inlineTextile(content.trim());
    return `<${tag}${attrStr}>${inner}</${tag}>`;
  });
  return `<tr>${tds.join("")}</tr>`;
}

/**
 * Textile 원문을 블록 단위로 파싱하여 HTML을 생성한다.
 * 이미 HTML 태그가 섞여 있으면 블록 식별이 실패할 수 있으므로, HTML 감지는 상위에서 분기한다.
 */
function textileToHtml(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];

  let i = 0;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length === 0) return;
    const joined = para.join("<br />");
    out.push(`<p>${inlineTextile(joined)}</p>`);
    para = [];
  };

  while (i < lines.length) {
    const line = lines[i];

    // 빈 줄: 단락 종결
    if (/^\s*$/.test(line)) {
      flushPara();
      i++;
      continue;
    }

    // <pre>...</pre> 다중 라인
    if (/^<pre>/.test(line)) {
      flushPara();
      const buf: string[] = [];
      let first = line.replace(/^<pre>/, "");
      if (/<\/pre>\s*$/.test(first)) {
        buf.push(first.replace(/<\/pre>\s*$/, ""));
        i++;
      } else {
        buf.push(first);
        i++;
        while (i < lines.length && !/<\/pre>/.test(lines[i])) {
          buf.push(lines[i]);
          i++;
        }
        if (i < lines.length) {
          buf.push(lines[i].replace(/<\/pre>.*$/, ""));
          i++;
        }
      }
      const code = buf.join("\n");
      out.push(`<pre><code>${escapeHtml(code)}</code></pre>`);
      continue;
    }

    // 수평선
    if (/^---\s*$/.test(line)) {
      flushPara();
      out.push(`<hr />`);
      i++;
      continue;
    }

    // 제목 h1~h6
    const hMatch = line.match(/^h([1-6])\.\s+(.*)$/);
    if (hMatch) {
      flushPara();
      const level = hMatch[1];
      const content = inlineTextile(hMatch[2]);
      out.push(`<h${level}>${content}</h${level}>`);
      i++;
      continue;
    }

    // 인용 bq. — 연속 라인 묶음
    if (/^bq\.\s+/.test(line)) {
      flushPara();
      const parts: string[] = [];
      while (i < lines.length && /^bq\.\s+/.test(lines[i])) {
        parts.push(lines[i].replace(/^bq\.\s+/, ""));
        i++;
      }
      const inner = parts.map((p) => `<p>${inlineTextile(p)}</p>`).join("");
      out.push(`<blockquote>${inner}</blockquote>`);
      continue;
    }

    // 코드 블록 bc.
    if (/^bc\.\s?/.test(line)) {
      flushPara();
      const first = line.replace(/^bc\.\s?/, "");
      const buf: string[] = [first];
      i++;
      while (i < lines.length && !/^\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      out.push(`<pre><code>${escapeHtml(buf.join("\n"))}</code></pre>`);
      continue;
    }

    // 테이블: 연속 |...| 라인
    if (/^\s*\|.*\|\s*$/.test(line)) {
      flushPara();
      const rows: string[] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        rows.push(parseTableRow(lines[i]));
        i++;
      }
      out.push(`<table><tbody>${rows.join("")}</tbody></table>`);
      continue;
    }

    // 리스트: 연속 * / # 라인
    if (/^(\*+|#+)\s+/.test(line)) {
      flushPara();
      type ListItem = { depth: number; ordered: boolean; content: string };
      const items: ListItem[] = [];
      while (i < lines.length) {
        const m = lines[i].match(/^(\*+|#+)\s+(.*)$/);
        if (!m) break;
        const marker = m[1];
        items.push({
          depth: marker.length,
          ordered: marker[0] === "#",
          content: m[2],
        });
        i++;
      }
      out.push(renderList(items));
      continue;
    }

    // 일반 라인 → 단락에 축적
    para.push(line);
    i++;
  }

  flushPara();
  return out.join("");
}

type ListItem = { depth: number; ordered: boolean; content: string };

function renderList(items: ListItem[]): string {
  let idx = 0;
  const walk = (depth: number): string => {
    const tag = items[idx]?.ordered ? "ol" : "ul";
    const lis: string[] = [];
    while (idx < items.length && items[idx].depth >= depth) {
      const cur = items[idx];
      if (cur.depth > depth) {
        const nested = walk(cur.depth);
        if (lis.length > 0) {
          // 이전 LI에 nested 목록을 추가
          lis[lis.length - 1] = lis[lis.length - 1].replace(/<\/li>$/, nested + "</li>");
        } else {
          lis.push(`<li>${nested}</li>`);
        }
      } else {
        lis.push(`<li>${inlineTextile(cur.content)}</li>`);
        idx++;
      }
    }
    return `<${tag}>${lis.join("")}</${tag}>`;
  };
  return walk(items[0].depth);
}

/** Redmine 마크업 문자열을 안전한 HTML로 변환. */
export function parseRedmineMarkup(raw: string): string {
  if (!raw || !raw.trim()) return "";

  // HTML 태그(특히 p/h/table/ul/ol/li/pre 등 블록)가 이미 포함되어 있는지 확인.
  // 인라인성 태그(<pre>)만 있는 경우에도 Textile 파서가 처리하므로, 블록 태그 여부로 분기.
  const hasBlockHtml = /<(p|h[1-6]|table|ul|ol|li|blockquote|div)\b/i.test(raw);

  let html: string;
  if (hasBlockHtml) {
    html = raw;
  } else {
    html = textileToHtml(raw);
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  return Array.from(doc.body.childNodes).map(sanitizeNode).join("");
}
