/**
 * 에디터 DOM이 산출하는 HTML을 Redmine Textile 원문으로 역변환.
 * 지원 범위:
 *   - 인라인: STRONG/B, EM/I, U, S/DEL/STRIKE, CODE, A, BR, IMG
 *   - 블록: P, H1~H6, UL/OL/LI (중첩), BLOCKQUOTE, PRE, HR
 *   - 테이블: TABLE/TR/TH/TD (colspan/rowspan, data-align 또는 class align-*)
 */

type Ctx = {
  listStack: Array<"ul" | "ol">;
};

function isInline(tag: string): boolean {
  return ["STRONG", "B", "EM", "I", "U", "S", "DEL", "STRIKE", "CODE", "A", "BR", "IMG", "SPAN"].includes(tag);
}

function serializeInline(node: Node, ctx: Ctx): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? "";
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as Element;
  const tag = el.tagName;
  const inner = Array.from(el.childNodes).map((c) => serializeInline(c, ctx)).join("");

  switch (tag) {
    case "STRONG":
    case "B":
      return inner ? `*${inner}*` : "";
    case "EM":
    case "I":
      return inner ? `_${inner}_` : "";
    case "U":
      return inner ? `+${inner}+` : "";
    case "S":
    case "DEL":
    case "STRIKE":
      return inner ? `-${inner}-` : "";
    case "CODE":
      return inner ? `@${inner}@` : "";
    case "BR":
      return "\n";
    case "A": {
      const href = el.getAttribute("href") ?? "";
      if (!href) return inner;
      return `"${inner}":${href}`;
    }
    case "IMG": {
      const src = el.getAttribute("src") ?? el.getAttribute("data-original-src") ?? "";
      const alt = el.getAttribute("alt") ?? "";
      if (!src) return "";
      return alt ? `!${src}(${alt})!` : `!${src}!`;
    }
    case "SPAN":
      return inner;
    default:
      return inner;
  }
}

function serializeList(el: Element, ctx: Ctx): string {
  const isOrdered = el.tagName === "OL";
  ctx.listStack.push(isOrdered ? "ol" : "ul");
  const depth = ctx.listStack.length;
  const lines: string[] = [];

  for (const child of Array.from(el.children)) {
    if (child.tagName !== "LI") continue;
    const inlineParts: string[] = [];
    const nestedLists: Element[] = [];

    for (const n of Array.from(child.childNodes)) {
      if (n.nodeType === Node.ELEMENT_NODE) {
        const e = n as Element;
        if (e.tagName === "UL" || e.tagName === "OL") {
          nestedLists.push(e);
          continue;
        }
        if (e.tagName === "P") {
          inlineParts.push(Array.from(e.childNodes).map((c) => serializeInline(c, ctx)).join(""));
          continue;
        }
        inlineParts.push(serializeInline(e, ctx));
      } else if (n.nodeType === Node.TEXT_NODE) {
        inlineParts.push(n.textContent ?? "");
      }
    }

    const content = inlineParts.join("").trim();
    const marker = (isOrdered ? "#" : "*").repeat(depth);
    if (content) lines.push(`${marker} ${content}`);
    for (const nested of nestedLists) {
      const nestedText = serializeList(nested, ctx);
      if (nestedText) lines.push(nestedText);
    }
  }

  ctx.listStack.pop();
  return lines.join("\n");
}

function cellAlign(el: Element): "left" | "right" | "center" | undefined {
  const dataAlign = el.getAttribute("data-align");
  if (dataAlign === "left" || dataAlign === "right" || dataAlign === "center") return dataAlign;
  const cls = el.getAttribute("class") ?? "";
  if (/\balign-left\b/.test(cls)) return "left";
  if (/\balign-right\b/.test(cls)) return "right";
  if (/\balign-center\b/.test(cls)) return "center";
  const inlineStyle = el.getAttribute("style") ?? "";
  const m = inlineStyle.match(/text-align\s*:\s*(left|right|center)/i);
  if (m) return m[1].toLowerCase() as "left" | "right" | "center";
  return undefined;
}

function serializeTable(el: Element, ctx: Ctx): string {
  // 모든 TR 수집 (THEAD/TBODY/TFOOT 구분 없이 순서대로)
  const rows: Element[] = [];
  el.querySelectorAll("tr").forEach((tr) => rows.push(tr));

  const lines: string[] = [];
  for (const tr of rows) {
    const cells: string[] = [];
    for (const c of Array.from(tr.children)) {
      if (c.tagName !== "TD" && c.tagName !== "TH") continue;
      const isHeader = c.tagName === "TH";
      const align = cellAlign(c);
      const colspan = parseInt(c.getAttribute("colspan") ?? "1", 10);
      const rowspan = parseInt(c.getAttribute("rowspan") ?? "1", 10);

      const modifiers: string[] = [];
      if (isHeader) modifiers.push("_");
      if (align === "left") modifiers.push("<");
      else if (align === "right") modifiers.push(">");
      else if (align === "center") modifiers.push("=");
      if (colspan > 1) modifiers.push(`\\${colspan}`);
      if (rowspan > 1) modifiers.push(`/${rowspan}`);

      const inner = Array.from(c.childNodes)
        .map((n) => {
          if (n.nodeType === Node.ELEMENT_NODE && (n as Element).tagName === "P") {
            return Array.from((n as Element).childNodes).map((cc) => serializeInline(cc, ctx)).join("");
          }
          return serializeInline(n, ctx);
        })
        .join("")
        .replace(/\n+/g, " ")
        .trim();

      const prefix = modifiers.length ? `${modifiers.join("")}. ` : "";
      cells.push(` ${prefix}${inner} `);
    }
    lines.push(`|${cells.join("|")}|`);
  }
  return lines.join("\n");
}

function serializeBlock(node: Node, ctx: Ctx): string {
  if (node.nodeType === Node.TEXT_NODE) {
    const t = node.textContent ?? "";
    return t.trim() ? t : "";
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as Element;
  const tag = el.tagName;

  if (tag === "P") {
    return Array.from(el.childNodes).map((c) => serializeInline(c, ctx)).join("");
  }

  if (/^H[1-6]$/.test(tag)) {
    const level = tag.substring(1);
    const inner = Array.from(el.childNodes).map((c) => serializeInline(c, ctx)).join("");
    return `h${level}. ${inner}`;
  }

  if (tag === "UL" || tag === "OL") {
    return serializeList(el, ctx);
  }

  if (tag === "BLOCKQUOTE") {
    const parts: string[] = [];
    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE && (child as Element).tagName === "P") {
        const inner = Array.from((child as Element).childNodes).map((c) => serializeInline(c, ctx)).join("");
        if (inner.trim()) parts.push(`bq. ${inner}`);
      } else {
        const inner = serializeInline(child, ctx);
        if (inner.trim()) parts.push(`bq. ${inner}`);
      }
    }
    return parts.join("\n");
  }

  if (tag === "PRE") {
    const codeEl = el.querySelector("code");
    const text = codeEl ? codeEl.textContent ?? "" : el.textContent ?? "";
    return `<pre>${text}</pre>`;
  }

  if (tag === "TABLE") {
    return serializeTable(el, ctx);
  }

  if (tag === "HR") {
    return "---";
  }

  if (tag === "DIV") {
    // 불필요한 래퍼는 자식을 블록으로 재귀 처리
    return Array.from(el.childNodes).map((c) => serializeBlock(c, ctx)).filter(Boolean).join("\n\n");
  }

  if (isInline(tag)) {
    return serializeInline(el, ctx);
  }

  return Array.from(el.childNodes).map((c) => serializeBlock(c, ctx)).filter(Boolean).join("\n\n");
}

export function htmlToTextile(html: string): string {
  if (!html || !html.trim()) return "";

  const doc = new DOMParser().parseFromString(html, "text/html");
  const ctx: Ctx = { listStack: [] };

  const blocks: string[] = [];
  for (const child of Array.from(doc.body.childNodes)) {
    const out = serializeBlock(child, ctx);
    if (out !== "") blocks.push(out);
  }

  return blocks.join("\n\n").trim();
}
