import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading,
  List,
  ListOrdered,
  Link as LinkIcon,
  Code,
  Quote,
  Code2,
  Table as TableIcon,
  Minus,
  ChevronDown,
  ArrowUpToLine,
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
} from "lucide-react";
import { parseRedmineMarkup } from "../../lib/markupParser";
import { htmlToTextile } from "../../lib/htmlToTextile";
import { useTranslation } from "../../lib/i18n";
import "./MarkupEditor.css";

interface MarkupEditorProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minHeight?: number;
}

type BlockTag = "P" | "H1" | "H2" | "H3" | "H4" | "H5" | "H6";
type AlignValue = "left" | "center" | "right" | "none";

// ──────────────────────────────────────────────────────────────
// DOM helpers
// ──────────────────────────────────────────────────────────────

function getSelectionRange(editor: HTMLElement): Range | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return null;
  return range;
}

function findTopBlock(editor: HTMLElement, node: Node | null): HTMLElement | null {
  let current: Node | null = node;
  if (current && current.nodeType === Node.TEXT_NODE) current = current.parentElement;
  while (current && current !== editor) {
    if (current.parentElement === editor) return current as HTMLElement;
    current = current.parentElement;
  }
  return null;
}

function findAncestor(
  node: Node | null,
  tagNames: string[],
  stopAt: HTMLElement
): HTMLElement | null {
  let current: Node | null = node;
  if (current && current.nodeType === Node.TEXT_NODE) current = current.parentElement;
  while (current && current !== stopAt) {
    if (current.nodeType === Node.ELEMENT_NODE && tagNames.includes((current as Element).tagName)) {
      return current as HTMLElement;
    }
    current = current.parentElement;
  }
  return null;
}

function placeCaretAtStart(node: Node) {
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  range.setStart(node, 0);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

function placeCaretAtEnd(node: Node) {
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  range.selectNodeContents(node);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

function ensureAtLeastOneBlock(editor: HTMLElement) {
  if (!editor.firstChild) {
    const p = document.createElement("p");
    p.appendChild(document.createElement("br"));
    editor.appendChild(p);
  }
}

function replaceBlockTag(block: HTMLElement, newTag: string): HTMLElement {
  const replaced = document.createElement(newTag);
  while (block.firstChild) replaced.appendChild(block.firstChild);
  block.replaceWith(replaced);
  return replaced;
}

// ──────────────────────────────────────────────────────────────
// Inline commands (bold/italic/underline/strike/code)
// ──────────────────────────────────────────────────────────────

function toggleInlineTag(editor: HTMLElement, tagName: string, aliasTags: string[] = []) {
  const range = getSelectionRange(editor);
  if (!range) return;

  const all = [tagName.toUpperCase(), ...aliasTags.map((s) => s.toUpperCase())];
  const existing = findAncestor(range.commonAncestorContainer, all, editor);

  if (existing) {
    // Unwrap
    const parent = existing.parentNode;
    if (!parent) return;
    // 선택 보존용 마커
    const startMarker = document.createTextNode("​");
    const endMarker = document.createTextNode("​");
    const startRange = range.cloneRange();
    startRange.collapse(true);
    startRange.insertNode(startMarker);
    const endRange = range.cloneRange();
    endRange.collapse(false);
    endRange.insertNode(endMarker);

    while (existing.firstChild) parent.insertBefore(existing.firstChild, existing);
    parent.removeChild(existing);

    const sel = window.getSelection();
    if (sel) {
      const r = document.createRange();
      r.setStartAfter(startMarker);
      r.setEndBefore(endMarker);
      sel.removeAllRanges();
      sel.addRange(r);
    }
    startMarker.remove();
    endMarker.remove();
    return;
  }

  // Wrap
  if (range.collapsed) {
    const wrap = document.createElement(tagName);
    wrap.appendChild(document.createTextNode("​"));
    range.insertNode(wrap);
    const r = document.createRange();
    r.setStart(wrap.firstChild!, 1);
    r.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(r);
    return;
  }

  const wrap = document.createElement(tagName);
  try {
    range.surroundContents(wrap);
  } catch {
    // 블록 경계를 넘어서는 경우: extract + wrap으로 폴백
    const frag = range.extractContents();
    wrap.appendChild(frag);
    range.insertNode(wrap);
  }

  const sel = window.getSelection();
  if (sel) {
    const r = document.createRange();
    r.selectNodeContents(wrap);
    sel.removeAllRanges();
    sel.addRange(r);
  }
}

// ──────────────────────────────────────────────────────────────
// Block commands
// ──────────────────────────────────────────────────────────────

function setBlockTag(editor: HTMLElement, newTag: BlockTag) {
  const range = getSelectionRange(editor);
  if (!range) return;
  const block = findTopBlock(editor, range.startContainer);
  if (!block) return;
  // 리스트/블록인용/테이블/프리 안이면 무시 (사용자 혼란 방지)
  if (["UL", "OL", "BLOCKQUOTE", "PRE", "TABLE"].includes(block.tagName)) return;
  if (block.tagName === newTag) return;
  const replaced = replaceBlockTag(block, newTag);
  placeCaretAtEnd(replaced);
}

function toggleList(editor: HTMLElement, ordered: boolean) {
  const range = getSelectionRange(editor);
  if (!range) return;
  const block = findTopBlock(editor, range.startContainer);
  if (!block) return;

  const targetListTag = ordered ? "OL" : "UL";

  // 이미 같은 종류의 리스트 안이면 해제
  if (block.tagName === targetListTag || block.tagName === (ordered ? "UL" : "OL")) {
    // 다른 종류면 리스트 타입 변경
    if (block.tagName !== targetListTag) {
      const newList = document.createElement(targetListTag);
      while (block.firstChild) newList.appendChild(block.firstChild);
      block.replaceWith(newList);
      return;
    }
    // 동일 종류 → 해제: 각 <li>를 <p>로 풀어낸다 (중첩 리스트는 해당 li 이후로 이동 복잡, MVP는 평탄화)
    const parent = block.parentNode;
    if (!parent) return;
    const items = Array.from(block.children).filter((c) => c.tagName === "LI") as HTMLElement[];
    const frag = document.createDocumentFragment();
    for (const li of items) {
      const p = document.createElement("p");
      // 중첩 ul/ol은 별도 블록으로 유지
      const nestedLists: Element[] = [];
      for (const n of Array.from(li.childNodes)) {
        if (n.nodeType === Node.ELEMENT_NODE && (n as Element).tagName.match(/^(UL|OL)$/)) {
          nestedLists.push(n as Element);
        } else {
          p.appendChild(n);
        }
      }
      if (!p.hasChildNodes()) p.appendChild(document.createElement("br"));
      frag.appendChild(p);
      for (const nl of nestedLists) frag.appendChild(nl);
    }
    parent.replaceChild(frag, block);
    return;
  }

  // P → LIST
  const list = document.createElement(targetListTag);
  const li = document.createElement("li");
  while (block.firstChild) li.appendChild(block.firstChild);
  if (!li.hasChildNodes()) li.appendChild(document.createElement("br"));
  list.appendChild(li);
  block.replaceWith(list);
  placeCaretAtEnd(li);
}

function toggleBlockquote(editor: HTMLElement) {
  const range = getSelectionRange(editor);
  if (!range) return;
  const block = findTopBlock(editor, range.startContainer);
  if (!block) return;

  if (block.tagName === "BLOCKQUOTE") {
    const parent = block.parentNode;
    if (!parent) return;
    const frag = document.createDocumentFragment();
    for (const c of Array.from(block.childNodes)) frag.appendChild(c);
    parent.replaceChild(frag, block);
    return;
  }

  // P → blockquote containing P
  const bq = document.createElement("blockquote");
  const p = document.createElement("p");
  while (block.firstChild) p.appendChild(block.firstChild);
  if (!p.hasChildNodes()) p.appendChild(document.createElement("br"));
  bq.appendChild(p);
  block.replaceWith(bq);
  placeCaretAtEnd(p);
}

function toggleCodeBlock(editor: HTMLElement) {
  const range = getSelectionRange(editor);
  if (!range) return;
  const block = findTopBlock(editor, range.startContainer);
  if (!block) return;

  if (block.tagName === "PRE") {
    // 해제 → P로
    const p = document.createElement("p");
    const code = block.querySelector("code");
    const text = code ? code.textContent ?? "" : block.textContent ?? "";
    p.textContent = text || "";
    if (!p.hasChildNodes()) p.appendChild(document.createElement("br"));
    block.replaceWith(p);
    placeCaretAtEnd(p);
    return;
  }

  const pre = document.createElement("pre");
  const code = document.createElement("code");
  code.textContent = block.textContent ?? "";
  if (!code.textContent) code.appendChild(document.createElement("br"));
  pre.appendChild(code);
  block.replaceWith(pre);
  placeCaretAtEnd(code);
}

function insertHr(editor: HTMLElement) {
  const range = getSelectionRange(editor);
  if (!range) return;
  const block = findTopBlock(editor, range.startContainer);
  if (!block) return;
  const hr = document.createElement("hr");
  block.after(hr);
  const p = document.createElement("p");
  p.appendChild(document.createElement("br"));
  hr.after(p);
  placeCaretAtStart(p);
}

function insertLink(editor: HTMLElement, url: string, fallbackLabel: string) {
  const range = getSelectionRange(editor);
  if (!range) return;

  const existing = findAncestor(range.commonAncestorContainer, ["A"], editor);
  if (existing && !url) {
    // 언래핑
    const parent = existing.parentNode;
    if (!parent) return;
    while (existing.firstChild) parent.insertBefore(existing.firstChild, existing);
    parent.removeChild(existing);
    return;
  }

  if (!url) return;

  const a = document.createElement("a");
  a.setAttribute("href", url);
  a.setAttribute("target", "_blank");
  a.setAttribute("rel", "noopener");

  if (range.collapsed) {
    a.textContent = fallbackLabel;
    range.insertNode(a);
    placeCaretAtEnd(a);
    return;
  }

  try {
    range.surroundContents(a);
  } catch {
    const frag = range.extractContents();
    a.appendChild(frag);
    range.insertNode(a);
  }
}

// ──────────────────────────────────────────────────────────────
// Table commands
// ──────────────────────────────────────────────────────────────

function insertTable(editor: HTMLElement, rows: number, cols: number) {
  const range = getSelectionRange(editor);
  if (!range) return;
  const block = findTopBlock(editor, range.startContainer);
  if (!block) return;

  const table = document.createElement("table");
  const tbody = document.createElement("tbody");
  for (let r = 0; r < rows; r++) {
    const tr = document.createElement("tr");
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement(r === 0 ? "th" : "td");
      cell.appendChild(document.createElement("br"));
      tr.appendChild(cell);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  // 빈 블록 교체 or 뒤에 삽입
  const isBlockEmpty =
    block.tagName === "P" && (block.innerHTML === "" || block.innerHTML === "<br>");
  if (isBlockEmpty) {
    block.replaceWith(table);
  } else {
    block.after(table);
  }

  const trailing = document.createElement("p");
  trailing.appendChild(document.createElement("br"));
  table.after(trailing);

  const firstCell = table.querySelector("th, td");
  if (firstCell) placeCaretAtStart(firstCell);
}

function getCurrentCell(editor: HTMLElement): HTMLElement | null {
  const range = getSelectionRange(editor);
  if (!range) return null;
  return findAncestor(range.commonAncestorContainer, ["TD", "TH"], editor);
}

function getCurrentTable(editor: HTMLElement): HTMLElement | null {
  const range = getSelectionRange(editor);
  if (!range) return null;
  return findAncestor(range.commonAncestorContainer, ["TABLE"], editor);
}

function addTableRow(editor: HTMLElement, direction: "above" | "below") {
  const cell = getCurrentCell(editor);
  if (!cell) return;
  const tr = cell.parentElement;
  if (!tr || tr.tagName !== "TR") return;
  const colCount = tr.children.length;
  const newTr = document.createElement("tr");
  for (let i = 0; i < colCount; i++) {
    const td = document.createElement("td");
    td.appendChild(document.createElement("br"));
    newTr.appendChild(td);
  }
  if (direction === "above") tr.before(newTr);
  else tr.after(newTr);
  placeCaretAtStart(newTr.firstChild!);
}

function addTableColumn(editor: HTMLElement, direction: "left" | "right") {
  const cell = getCurrentCell(editor);
  if (!cell) return;
  const tr = cell.parentElement;
  if (!tr) return;
  const colIndex = Array.from(tr.children).indexOf(cell);
  const table = cell.closest("table");
  if (!table) return;
  const rows = table.querySelectorAll("tr");
  rows.forEach((row, rowIdx) => {
    const tagName = rowIdx === 0 && row.querySelector("th") ? "th" : "td";
    const newCell = document.createElement(tagName);
    newCell.appendChild(document.createElement("br"));
    const target = row.children[colIndex];
    if (!target) {
      row.appendChild(newCell);
      return;
    }
    if (direction === "left") target.before(newCell);
    else target.after(newCell);
  });
}

function deleteTableRow(editor: HTMLElement) {
  const cell = getCurrentCell(editor);
  if (!cell) return;
  const tr = cell.parentElement;
  const table = cell.closest("table");
  if (!tr || !table) return;
  const allRows = table.querySelectorAll("tr");
  if (allRows.length === 1) {
    // 마지막 행이면 테이블 자체 제거
    deleteTable(editor);
    return;
  }
  const next = (tr.nextElementSibling || tr.previousElementSibling) as HTMLElement | null;
  tr.remove();
  if (next && next.firstChild) placeCaretAtStart(next.firstChild);
}

function deleteTableColumn(editor: HTMLElement) {
  const cell = getCurrentCell(editor);
  if (!cell) return;
  const tr = cell.parentElement;
  const table = cell.closest("table");
  if (!tr || !table) return;
  const colIndex = Array.from(tr.children).indexOf(cell);
  const rows = table.querySelectorAll("tr");
  // 남은 열이 1개면 테이블 전체 삭제
  if (tr.children.length === 1) {
    deleteTable(editor);
    return;
  }
  rows.forEach((row) => {
    const target = row.children[colIndex];
    if (target) target.remove();
  });
}

function deleteTable(editor: HTMLElement) {
  const table = getCurrentTable(editor);
  if (!table) return;
  const p = document.createElement("p");
  p.appendChild(document.createElement("br"));
  table.replaceWith(p);
  placeCaretAtStart(p);
}

function toggleHeaderRow(editor: HTMLElement) {
  const table = getCurrentTable(editor);
  if (!table) return;
  const firstRow = table.querySelector("tr");
  if (!firstRow) return;
  const hasHeader = Array.from(firstRow.children).every((c) => c.tagName === "TH");
  const targetTag = hasHeader ? "td" : "th";
  Array.from(firstRow.children).forEach((c) => {
    const swap = document.createElement(targetTag);
    while (c.firstChild) swap.appendChild(c.firstChild);
    // 속성 복사
    for (const attr of Array.from(c.attributes)) swap.setAttribute(attr.name, attr.value);
    c.replaceWith(swap);
  });
}

function setCellAlign(editor: HTMLElement, align: AlignValue) {
  const cell = getCurrentCell(editor);
  if (!cell) return;
  if (align === "none") {
    cell.removeAttribute("data-align");
    cell.classList.remove("align-left", "align-center", "align-right");
  } else {
    cell.setAttribute("data-align", align);
    cell.classList.remove("align-left", "align-center", "align-right");
    cell.classList.add(`align-${align}`);
  }
}

function mergeCellRight(editor: HTMLElement) {
  const cell = getCurrentCell(editor);
  if (!cell) return;
  const next = cell.nextElementSibling as HTMLElement | null;
  if (!next) return;
  const cur = parseInt(cell.getAttribute("colspan") ?? "1", 10);
  const add = parseInt(next.getAttribute("colspan") ?? "1", 10);
  cell.setAttribute("colspan", String(cur + add));
  // 내용 합치기
  while (next.firstChild) cell.appendChild(next.firstChild);
  next.remove();
}

function mergeCellDown(editor: HTMLElement) {
  const cell = getCurrentCell(editor);
  if (!cell) return;
  const tr = cell.parentElement;
  if (!tr) return;
  const colIndex = Array.from(tr.children).indexOf(cell);
  const nextTr = tr.nextElementSibling as HTMLElement | null;
  if (!nextTr) return;
  const below = nextTr.children[colIndex] as HTMLElement | undefined;
  if (!below) return;
  const cur = parseInt(cell.getAttribute("rowspan") ?? "1", 10);
  const add = parseInt(below.getAttribute("rowspan") ?? "1", 10);
  cell.setAttribute("rowspan", String(cur + add));
  while (below.firstChild) cell.appendChild(below.firstChild);
  below.remove();
}

function splitCell(editor: HTMLElement) {
  const cell = getCurrentCell(editor);
  if (!cell) return;
  cell.removeAttribute("colspan");
  cell.removeAttribute("rowspan");
}

// ──────────────────────────────────────────────────────────────
// Enter / Shift+Enter handling
// ──────────────────────────────────────────────────────────────

function splitBlockAtCursor(editor: HTMLElement) {
  const range = getSelectionRange(editor);
  if (!range) return;
  if (!range.collapsed) range.deleteContents();

  // 리스트 아이템 안이면 새 LI
  const li = findAncestor(range.startContainer, ["LI"], editor);
  if (li) {
    // li가 빈 상태에서 Enter → 리스트에서 탈출 (새 P)
    if (li.textContent?.trim() === "" && !li.querySelector("ul, ol")) {
      const list = li.parentElement as HTMLElement;
      const p = document.createElement("p");
      p.appendChild(document.createElement("br"));
      // li를 제거하고, 뒤쪽 형제가 있으면 리스트 분할
      const parent = list.parentElement;
      if (!parent) return;
      const remainingAfter: Element[] = [];
      let seen = false;
      for (const child of Array.from(list.children)) {
        if (child === li) {
          seen = true;
          continue;
        }
        if (seen) remainingAfter.push(child);
      }
      li.remove();
      if (remainingAfter.length > 0) {
        const newList = document.createElement(list.tagName);
        for (const it of remainingAfter) newList.appendChild(it);
        list.after(newList);
      }
      list.after(p);
      if (list.children.length === 0) list.remove();
      placeCaretAtStart(p);
      return;
    }

    // 일반 분할
    const newLi = splitElementAtRange(li, range, "li");
    placeCaretAtStart(newLi);
    return;
  }

  // 테이블 셀 안이면 셀 내부에 <br> 삽입 (셀 안에서 Enter는 줄바꿈)
  const cell = findAncestor(range.startContainer, ["TD", "TH"], editor);
  if (cell) {
    insertLineBreakAtCursor(editor);
    return;
  }

  // PRE 안이면 줄바꿈만
  const pre = findAncestor(range.startContainer, ["PRE"], editor);
  if (pre) {
    insertLineBreakAtCursor(editor);
    return;
  }

  // 일반 블록: 현재 블록 분할 → 새 <p>로
  const block = findTopBlock(editor, range.startContainer);
  if (!block) return;

  // blockquote는 내부 <p>를 분할
  if (block.tagName === "BLOCKQUOTE") {
    const innerP = findAncestor(range.startContainer, ["P"], editor);
    if (innerP && block.contains(innerP)) {
      const newP = splitElementAtRange(innerP, range, "p");
      placeCaretAtStart(newP);
      return;
    }
  }

  // 헤딩이면 새 블록은 P (헤딩 연속 방지)
  const newTag = /^H[1-6]$/.test(block.tagName) ? "p" : block.tagName.toLowerCase();
  const newBlock = splitElementAtRange(block, range, newTag);
  placeCaretAtStart(newBlock);
}

/**
 * 주어진 element를 range 위치에서 분할하고, 동일 구조의 새 element를 반환한다.
 * range는 element 내부에 있어야 한다.
 */
function splitElementAtRange(element: HTMLElement, range: Range, newTagName: string): HTMLElement {
  const newEl = document.createElement(newTagName);

  // range.endContainer부터 element 끝까지 extract
  const tailRange = document.createRange();
  tailRange.setStart(range.endContainer, range.endOffset);
  tailRange.setEnd(element, element.childNodes.length);
  const tailFrag = tailRange.extractContents();
  newEl.appendChild(tailFrag);

  if (!element.hasChildNodes()) element.appendChild(document.createElement("br"));
  if (!newEl.hasChildNodes()) newEl.appendChild(document.createElement("br"));

  element.after(newEl);
  return newEl;
}

function insertLineBreakAtCursor(editor: HTMLElement) {
  const range = getSelectionRange(editor);
  if (!range) return;
  if (!range.collapsed) range.deleteContents();
  const br = document.createElement("br");
  range.insertNode(br);
  // 커서를 br 뒤로
  const sel = window.getSelection();
  if (!sel) return;
  const r = document.createRange();
  r.setStartAfter(br);
  r.collapse(true);
  sel.removeAllRanges();
  sel.addRange(r);

  // 커서 뒤에 텍스트 노드가 없으면 zero-width 공간 삽입해서 br이 보이도록
  if (!br.nextSibling) {
    const zwsp = document.createTextNode("​");
    br.after(zwsp);
    const r2 = document.createRange();
    r2.setStart(zwsp, 1);
    r2.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r2);
  }
}

// Tab 처리
function handleTabInList(editor: HTMLElement, shift: boolean): boolean {
  const range = getSelectionRange(editor);
  if (!range) return false;
  const li = findAncestor(range.startContainer, ["LI"], editor);
  if (!li) return false;

  const parentList = li.parentElement as HTMLElement;
  if (!parentList) return false;

  if (!shift) {
    // 들여쓰기: 이전 LI에 중첩 리스트로 이동
    const prev = li.previousElementSibling as HTMLElement | null;
    if (!prev) return true; // 맨 앞이면 불가
    const existingNested = Array.from(prev.children).find((c) =>
      ["UL", "OL"].includes(c.tagName)
    ) as HTMLElement | undefined;
    if (existingNested) {
      existingNested.appendChild(li);
    } else {
      const newNested = document.createElement(parentList.tagName);
      newNested.appendChild(li);
      prev.appendChild(newNested);
    }
    return true;
  } else {
    // 내어쓰기: 조상 LI 뒤로 이동
    const grandLi = parentList.parentElement;
    if (!grandLi || grandLi.tagName !== "LI") return true; // 최상위면 불가
    const grandList = grandLi.parentElement as HTMLElement;
    if (!grandList) return true;
    grandLi.after(li);
    if (parentList.children.length === 0) parentList.remove();
    return true;
  }
}

function handleTabInTable(editor: HTMLElement, shift: boolean): boolean {
  const cell = getCurrentCell(editor);
  if (!cell) return false;
  const tr = cell.parentElement;
  if (!tr) return false;
  const cells = Array.from(tr.parentElement?.parentElement?.querySelectorAll("td, th") ?? []);
  const idx = cells.indexOf(cell);
  if (idx < 0) return false;
  const targetIdx = shift ? idx - 1 : idx + 1;
  const target = cells[targetIdx];
  if (target) {
    placeCaretAtStart(target.firstChild ?? target);
    return true;
  }
  // 맨 끝에서 Tab → 새 행 추가
  if (!shift) {
    addTableRow(editor, "below");
    return true;
  }
  return true;
}

// ──────────────────────────────────────────────────────────────
// Heading dropdown
// ──────────────────────────────────────────────────────────────

interface HeadingDropdownProps {
  label: string;
  current: BlockTag | null;
  onSelect: (tag: BlockTag) => void;
}

function HeadingDropdown({ label, current, onSelect }: HeadingDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const options: Array<{ tag: BlockTag; label: string }> = [
    { tag: "P", label: "Paragraph" },
    { tag: "H1", label: "H1" },
    { tag: "H2", label: "H2" },
    { tag: "H3", label: "H3" },
    { tag: "H4", label: "H4" },
    { tag: "H5", label: "H5" },
    { tag: "H6", label: "H6" },
  ];

  const displayLabel = current && current !== "P" ? current : label;

  return (
    <div className="markup-editor-dropdown" ref={rootRef}>
      <button
        type="button"
        className="markup-editor-btn markup-editor-btn-dropdown"
        title={label}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
      >
        <Heading size={14} />
        <span className="markup-editor-dropdown-label">{displayLabel}</span>
        <ChevronDown size={10} />
      </button>
      {open && (
        <div className="markup-editor-dropdown-menu" role="menu">
          {options.map((opt) => (
            <button
              key={opt.tag}
              type="button"
              role="menuitem"
              className={`markup-editor-dropdown-item ${current === opt.tag ? "active" : ""}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onSelect(opt.tag);
                setOpen(false);
              }}
            >
              <span className={`markup-editor-dropdown-preview preview-${opt.tag.toLowerCase()}`}>
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Table grid picker
// ──────────────────────────────────────────────────────────────

interface TableGridPickerProps {
  label: string;
  onSelect: (rows: number, cols: number) => void;
}

function TableGridPicker({ label, onSelect }: TableGridPickerProps) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<{ r: number; c: number }>({ r: 0, c: 0 });
  const rootRef = useRef<HTMLDivElement>(null);

  const MAX_ROWS = 8;
  const MAX_COLS = 10;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const cells: ReactNode[] = [];
  for (let r = 1; r <= MAX_ROWS; r++) {
    for (let c = 1; c <= MAX_COLS; c++) {
      const active = r <= hover.r && c <= hover.c;
      cells.push(
        <div
          key={`${r}-${c}`}
          className={`markup-editor-grid-cell ${active ? "active" : ""}`}
          onMouseEnter={() => setHover({ r, c })}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(r, c);
            setOpen(false);
            setHover({ r: 0, c: 0 });
          }}
        />
      );
    }
  }

  return (
    <div className="markup-editor-dropdown" ref={rootRef}>
      <button
        type="button"
        className="markup-editor-btn"
        title={label}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
      >
        <TableIcon size={14} />
      </button>
      {open && (
        <div className="markup-editor-grid-menu" role="menu">
          <div
            className="markup-editor-grid"
            style={{ gridTemplateColumns: `repeat(${MAX_COLS}, 1fr)` }}
            onMouseLeave={() => setHover({ r: 0, c: 0 })}
          >
            {cells}
          </div>
          <div className="markup-editor-grid-label">
            {hover.r > 0 ? `${hover.r} × ${hover.c}` : "—"}
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────

export function MarkupEditor({ value, onChange, placeholder, minHeight = 140 }: MarkupEditorProps) {
  const { t } = useTranslation();
  const editorRef = useRef<HTMLDivElement>(null);
  const lastEmittedRef = useRef<string>(value);
  const initializedRef = useRef(false);
  const isComposingRef = useRef(false);
  const [, rerender] = useState(0);
  const [isEmpty, setIsEmpty] = useState(!value?.trim());

  // 초기 로드 및 외부 value 변경 동기화
  useLayoutEffect(() => {
    if (!editorRef.current) return;
    if (initializedRef.current && value === lastEmittedRef.current) return;
    const html = parseRedmineMarkup(value);
    editorRef.current.innerHTML = html || "";
    ensureAtLeastOneBlock(editorRef.current);
    lastEmittedRef.current = value;
    initializedRef.current = true;
    setIsEmpty(isEditorEmpty(editorRef.current));
  }, [value]);

  const emit = useCallback(() => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    const textile = htmlToTextile(html);
    lastEmittedRef.current = textile;
    onChange(textile);
    setIsEmpty(isEditorEmpty(editorRef.current));
  }, [onChange]);

  const withEditor = useCallback(
    (fn: (editor: HTMLElement) => void) => {
      const editor = editorRef.current;
      if (!editor) return;
      if (isComposingRef.current) return;
      editor.focus();
      fn(editor);
      ensureAtLeastOneBlock(editor);
      emit();
      rerender((v) => v + 1);
    },
    [emit]
  );

  // 현재 선택 위치의 상태 계산 (툴바 active)
  const status = useEditorStatus(editorRef);

  const handleBeforeInput = useCallback(
    (e: React.FormEvent<HTMLDivElement>) => {
      const native = e.nativeEvent as InputEvent;
      const type = native.inputType;
      if (isComposingRef.current) return;
      const editor = editorRef.current;
      if (!editor) return;

      if (type === "insertParagraph") {
        e.preventDefault();
        splitBlockAtCursor(editor);
        ensureAtLeastOneBlock(editor);
        emit();
        rerender((v) => v + 1);
      } else if (type === "insertLineBreak") {
        e.preventDefault();
        insertLineBreakAtCursor(editor);
        emit();
      }
    },
    [emit]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (isComposingRef.current) return;
      const editor = editorRef.current;
      if (!editor) return;

      if (e.key === "Tab") {
        if (handleTabInList(editor, e.shiftKey)) {
          e.preventDefault();
          emit();
          rerender((v) => v + 1);
          return;
        }
        if (handleTabInTable(editor, e.shiftKey)) {
          e.preventDefault();
          rerender((v) => v + 1);
          return;
        }
      }

      // Enter/Shift+Enter — 기본 processing은 beforeinput에서 처리. 일부 브라우저는 beforeinput만 발생하여 OK.
    },
    [emit]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      // 서식 있는 HTML을 직접 수용하지 않고, 텍스트만 취해 Textile→HTML 재파싱한다.
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      if (!text) return;
      const html = parseRedmineMarkup(text);
      const range = getSelectionRange(editorRef.current!);
      if (!range) return;
      if (!range.collapsed) range.deleteContents();

      const template = document.createElement("div");
      template.innerHTML = html;
      // 단일 인라인 내용이면 그대로, 블록이면 현재 블록 뒤에 삽입
      const nodes = Array.from(template.childNodes);
      if (nodes.length === 0) return;
      const isSingleP = nodes.length === 1 && (nodes[0] as Element).tagName === "P";
      if (isSingleP) {
        const inner = Array.from((nodes[0] as HTMLElement).childNodes);
        for (const n of inner) range.insertNode(n);
      } else {
        const frag = document.createDocumentFragment();
        for (const n of nodes) frag.appendChild(n);
        range.insertNode(frag);
      }
      // 커서 위치 정리
      const sel = window.getSelection();
      if (sel) sel.collapseToEnd();
      emit();
      rerender((v) => v + 1);
    },
    [emit]
  );

  const inTable = status.inTable;

  return (
    <div className="markup-editor">
      <div className="markup-editor-toolbar">
        <ToolbarButton
          icon={<Bold size={14} />}
          title={t("markupEditor.bold")}
          active={status.bold}
          onClick={() => withEditor((ed) => toggleInlineTag(ed, "strong", ["b"]))}
        />
        <ToolbarButton
          icon={<Italic size={14} />}
          title={t("markupEditor.italic")}
          active={status.italic}
          onClick={() => withEditor((ed) => toggleInlineTag(ed, "em", ["i"]))}
        />
        <ToolbarButton
          icon={<UnderlineIcon size={14} />}
          title={t("markupEditor.underline")}
          active={status.underline}
          onClick={() => withEditor((ed) => toggleInlineTag(ed, "u"))}
        />
        <ToolbarButton
          icon={<Strikethrough size={14} />}
          title={t("markupEditor.strike")}
          active={status.strike}
          onClick={() => withEditor((ed) => toggleInlineTag(ed, "s", ["del", "strike"]))}
        />
        <ToolbarButton
          icon={<Code size={14} />}
          title={t("markupEditor.code")}
          active={status.code}
          onClick={() => withEditor((ed) => toggleInlineTag(ed, "code"))}
        />
        <Separator />
        <HeadingDropdown
          label={t("markupEditor.heading")}
          current={status.blockTag}
          onSelect={(tag) => withEditor((ed) => setBlockTag(ed, tag))}
        />
        <ToolbarButton
          icon={<List size={14} />}
          title={t("markupEditor.ul")}
          active={status.inUl}
          onClick={() => withEditor((ed) => toggleList(ed, false))}
        />
        <ToolbarButton
          icon={<ListOrdered size={14} />}
          title={t("markupEditor.ol")}
          active={status.inOl}
          onClick={() => withEditor((ed) => toggleList(ed, true))}
        />
        <ToolbarButton
          icon={<Quote size={14} />}
          title={t("markupEditor.quote")}
          active={status.inBlockquote}
          onClick={() => withEditor((ed) => toggleBlockquote(ed))}
        />
        <ToolbarButton
          icon={<Code2 size={14} />}
          title={t("markupEditor.codeBlock")}
          active={status.inCodeBlock}
          onClick={() => withEditor((ed) => toggleCodeBlock(ed))}
        />
        <Separator />
        <ToolbarButton
          icon={<LinkIcon size={14} />}
          title={t("markupEditor.link")}
          active={status.inLink}
          onClick={() =>
            withEditor((ed) => {
              if (status.inLink) {
                insertLink(ed, "", "");
                return;
              }
              const url = window.prompt(t("markupEditor.linkPrompt"), "https://");
              if (url) insertLink(ed, url, t("markupEditor.linkLabel"));
            })
          }
        />
        <TableGridPicker
          label={t("markupEditor.table")}
          onSelect={(r, c) => withEditor((ed) => insertTable(ed, r, c))}
        />
        <ToolbarButton
          icon={<Minus size={14} />}
          title={t("markupEditor.hr")}
          active={false}
          onClick={() => withEditor((ed) => insertHr(ed))}
        />

        {inTable && (
          <>
            <Separator />
            <ToolbarButton
              icon={<ArrowUpToLine size={14} />}
              title={t("markupEditor.rowAbove")}
              active={false}
              onClick={() => withEditor((ed) => addTableRow(ed, "above"))}
            />
            <ToolbarButton
              icon={<ArrowDownToLine size={14} />}
              title={t("markupEditor.rowBelow")}
              active={false}
              onClick={() => withEditor((ed) => addTableRow(ed, "below"))}
            />
            <ToolbarButton
              icon={<ArrowLeftToLine size={14} />}
              title={t("markupEditor.colLeft")}
              active={false}
              onClick={() => withEditor((ed) => addTableColumn(ed, "left"))}
            />
            <ToolbarButton
              icon={<ArrowRightToLine size={14} />}
              title={t("markupEditor.colRight")}
              active={false}
              onClick={() => withEditor((ed) => addTableColumn(ed, "right"))}
            />
            <button
              type="button"
              className="markup-editor-btn markup-editor-btn-text"
              title={t("markupEditor.deleteRow")}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => withEditor((ed) => deleteTableRow(ed))}
            >
              −R
            </button>
            <button
              type="button"
              className="markup-editor-btn markup-editor-btn-text"
              title={t("markupEditor.deleteCol")}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => withEditor((ed) => deleteTableColumn(ed))}
            >
              −C
            </button>
            <ToolbarButton
              icon={<AlignLeft size={14} />}
              title={t("markupEditor.alignLeft")}
              active={status.cellAlign === "left"}
              onClick={() => withEditor((ed) => setCellAlign(ed, "left"))}
            />
            <ToolbarButton
              icon={<AlignCenter size={14} />}
              title={t("markupEditor.alignCenter")}
              active={status.cellAlign === "center"}
              onClick={() => withEditor((ed) => setCellAlign(ed, "center"))}
            />
            <ToolbarButton
              icon={<AlignRight size={14} />}
              title={t("markupEditor.alignRight")}
              active={status.cellAlign === "right"}
              onClick={() => withEditor((ed) => setCellAlign(ed, "right"))}
            />
            <span className="markup-editor-merge-label">{t("markupEditor.merge")}:</span>
            <button
              type="button"
              className="markup-editor-btn markup-editor-btn-text"
              title={t("markupEditor.mergeRight")}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => withEditor((ed) => mergeCellRight(ed))}
            >
              →
            </button>
            <button
              type="button"
              className="markup-editor-btn markup-editor-btn-text"
              title={t("markupEditor.mergeDown")}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => withEditor((ed) => mergeCellDown(ed))}
            >
              ↓
            </button>
            <button
              type="button"
              className="markup-editor-btn markup-editor-btn-text"
              title={t("markupEditor.splitCell")}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => withEditor((ed) => splitCell(ed))}
            >
              ⊟
            </button>
            <ToolbarButton
              icon={<Heading size={14} />}
              title={t("markupEditor.toggleHeaderRow")}
              active={status.headerRow}
              onClick={() => withEditor((ed) => toggleHeaderRow(ed))}
            />
            <ToolbarButton
              icon={<Trash2 size={14} />}
              title={t("markupEditor.deleteTable")}
              active={false}
              onClick={() => withEditor((ed) => deleteTable(ed))}
            />
          </>
        )}
      </div>
      <div
        className="markup-editor-body"
        data-empty={isEmpty ? "true" : "false"}
        data-placeholder={placeholder ?? ""}
      >
        <div
          ref={editorRef}
          className="markup-editor-prose"
          style={{ minHeight }}
          contentEditable
          suppressContentEditableWarning
          onBeforeInput={handleBeforeInput}
          onInput={emit}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={() => {
            isComposingRef.current = false;
            emit();
          }}
          onKeyUp={() => rerender((v) => v + 1)}
          onMouseUp={() => rerender((v) => v + 1)}
        />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Sub-pieces
// ──────────────────────────────────────────────────────────────

function ToolbarButton({
  icon,
  title,
  active,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`markup-editor-btn ${active ? "active" : ""}`}
      title={title}
      aria-label={title}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {icon}
    </button>
  );
}

function Separator() {
  return <span className="markup-editor-separator" />;
}

function isEditorEmpty(editor: HTMLElement): boolean {
  if (!editor.firstChild) return true;
  if (editor.children.length !== 1) return false;
  const only = editor.firstElementChild;
  if (!only) return true;
  if (only.tagName !== "P") return false;
  const txt = only.textContent ?? "";
  if (txt.trim().length > 0) return false;
  // <br>만 있는 경우
  return true;
}

interface EditorStatus {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  code: boolean;
  blockTag: BlockTag | null;
  inUl: boolean;
  inOl: boolean;
  inBlockquote: boolean;
  inCodeBlock: boolean;
  inLink: boolean;
  inTable: boolean;
  cellAlign: AlignValue;
  headerRow: boolean;
}

function useEditorStatus(editorRef: React.RefObject<HTMLDivElement | null>): EditorStatus {
  const [status, setStatus] = useState<EditorStatus>(() => defaultStatus());

  useEffect(() => {
    const update = () => {
      const editor = editorRef.current;
      if (!editor) return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) {
        setStatus(defaultStatus());
        return;
      }
      const range = sel.getRangeAt(0);
      if (!editor.contains(range.commonAncestorContainer)) {
        return;
      }
      setStatus(calcStatus(editor, range));
    };

    const onSelect = () => update();
    document.addEventListener("selectionchange", onSelect);
    return () => document.removeEventListener("selectionchange", onSelect);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return status;
}

function defaultStatus(): EditorStatus {
  return {
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    code: false,
    blockTag: null,
    inUl: false,
    inOl: false,
    inBlockquote: false,
    inCodeBlock: false,
    inLink: false,
    inTable: false,
    cellAlign: "none",
    headerRow: false,
  };
}

function calcStatus(editor: HTMLElement, range: Range): EditorStatus {
  const container = range.commonAncestorContainer;
  const block = findTopBlock(editor, container);

  const bold = !!findAncestor(container, ["STRONG", "B"], editor);
  const italic = !!findAncestor(container, ["EM", "I"], editor);
  const underline = !!findAncestor(container, ["U"], editor);
  const strike = !!findAncestor(container, ["S", "DEL", "STRIKE"], editor);
  const code = !!findAncestor(container, ["CODE"], editor) && !findAncestor(container, ["PRE"], editor);
  const inUl = !!findAncestor(container, ["UL"], editor);
  const inOl = !!findAncestor(container, ["OL"], editor);
  const inBlockquote = !!findAncestor(container, ["BLOCKQUOTE"], editor);
  const inCodeBlock = !!findAncestor(container, ["PRE"], editor);
  const inLink = !!findAncestor(container, ["A"], editor);
  const tableEl = findAncestor(container, ["TABLE"], editor);
  const inTable = !!tableEl;

  let blockTag: BlockTag | null = null;
  if (block && !inUl && !inOl && !inBlockquote && !inTable) {
    const tag = block.tagName;
    if (tag === "P" || /^H[1-6]$/.test(tag)) blockTag = tag as BlockTag;
  }

  let cellAlign: AlignValue = "none";
  let headerRow = false;
  if (inTable) {
    const cell = findAncestor(container, ["TD", "TH"], editor);
    if (cell) {
      const v = cell.getAttribute("data-align");
      if (v === "left" || v === "center" || v === "right") cellAlign = v;
      else {
        const cls = cell.getAttribute("class") ?? "";
        if (/\balign-left\b/.test(cls)) cellAlign = "left";
        else if (/\balign-center\b/.test(cls)) cellAlign = "center";
        else if (/\balign-right\b/.test(cls)) cellAlign = "right";
      }
      const firstRow = tableEl!.querySelector("tr");
      if (firstRow) {
        headerRow = Array.from(firstRow.children).every((c) => c.tagName === "TH");
      }
    }
  }

  return {
    bold,
    italic,
    underline,
    strike,
    code,
    blockTag,
    inUl,
    inOl,
    inBlockquote,
    inCodeBlock,
    inLink,
    inTable,
    cellAlign,
    headerRow,
  };
}
