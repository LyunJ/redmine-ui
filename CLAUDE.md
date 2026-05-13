# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Redmine의 사용성 개선을 위한 크로스 플랫폼 데스크톱 클라이언트. System tray 상주 + 글로벌 단축키로 floating 되는 경량 앱.

## Tech Stack

- **Desktop Framework**: Tauri v2 (Rust backend)
- **Frontend**: React + TypeScript + Vite
- **State Management**: Zustand
- **Tauri Plugins**: global-shortcut, store, http, process, opener
- **UI Libraries**: lucide-react (아이콘), date-fns (날짜), qrcode.react (QR 코드)
- **UI**: CSS custom properties 기반 light/dark theme
- **i18n**: `src/lib/i18n.ts` 기반 ko/en 이중 언어. `useTranslation()` hook으로 접근. 기본값 영어

## Commands

```bash
# 개발 서버 실행 (Rust + Vite 동시 실행)
npm run tauri dev

# 프로덕션 빌드
npm run tauri build

# 프론트엔드만 빌드
npm run build

# 프론트엔드 dev server만
npm run dev
```

Rust 빌드 시 SSL 관련 오류가 발생하면 환경변수 설정 필요:
```bash
export CARGO_HTTP_CHECK_REVOKE=false
```

## Architecture

```
src-tauri/src/
  main.rs   - Rust 진입점
  lib.rs    - Tauri 앱 설정. plugin 등록, global hotkey(Ctrl/Cmd+Shift+R) 핸들러, tray 초기화
  tray.rs   - System tray 생성. Windows: 좌클릭 창 토글 + 우클릭 메뉴. macOS: 좌클릭 메뉴 표시 (OS 관례)

src/
  App.tsx   - 최상위 컴포넌트. 인증 분기, 상세 뷰 분기, polling 설정, IssueEditModal 렌더링, initLanguage() 호출
  types/
    redmine.ts - Redmine API 타입 (Issue, User, Status, Tracker, Project, Member, IssueCreatePayload, IssueUpdatePayload 등)
    app.ts     - 앱 내부 타입 (ViewTab, SortField, Theme, PersonalTask, CustomFilter, FilterCondition 등)
  stores/
    authStore.ts        - 인증 상태, API Key 저장/복원
    issueStore.ts       - 일감 목록 (뷰별 fetch), 선택된 일감 상세, last_seen 관리, 일감 CRUD(등록/수정/댓글), 등록·수정 모달 상태(isCreateModalOpen, editingIssueId)
    settingsStore.ts    - 테마, 폴링 간격, 언어(ko/en) 설정
    personalTaskStore.ts - 로컬 개인 작업 CRUD
    todoStore.ts        - 할일 보드 섹션/항목 관리, 커스텀 필터별 섹션 관리
  lib/
    redmineClient.ts - Redmine REST API wrapper. X-Redmine-API-Key header 인증. 일감 CRUD, 댓글, 프로젝트/트래커/우선순위 조회 포함
    dateUtils.ts     - 진행률 계산, 날짜 포맷 유틸
    calendarUtils.ts - Google Calendar URL 생성, ICS 파일 생성
    markupParser.ts  - Redmine Textile/HTML 마크업 → React 렌더링 (XSS 방지)
    filterUtils.ts   - 커스텀 필터 조건 적용 (일감 필터링 엔진)
    i18n.ts          - ko/en 번역 딕셔너리 + useTranslation() hook
  styles/
    variables.css - CSS custom properties (light/dark 테마 변수)
    global.css    - 글로벌 스타일
  components/
    layout/   - TitleBar (custom decorations, drag region, 최대화 토글, 새로고침/polling 간격), BottomBar (새 일감/개인 작업/섹션 추가)
    auth/     - LoginForm (URL + API Key)
    common/   - LoadingSpinner, ImageViewer (확대/축소/드래그), MarkupEditor (Textile 툴바 + 프리뷰 텍스트 에디터)
    issues/   - IssueList, IssueItem, IssueDetail (수정 버튼 + 댓글 입력폼 포함), ProgressBar, SortControls, PriorityBadge,
                ViewTabs, FilterBar, FilterEditor, TodoView, AddTaskModal, CalendarButton, PersonalTaskItem, PersonalTaskDetail,
                IssueEditModal (일감 등록/수정 모달)
```

## Key Design Decisions

- **Window**: decorations:false + alwaysOnTop(토글 가능). 닫기(X) 버튼은 앱 종료. 창 숨기기는 tray 좌클릭 또는 Ctrl+Shift+R. TitleBar는 커스텀 드래그 영역 + 앱 기능 버튼(레드마인 웹 열기, 새로고침, 폴링 간격, 로그아웃, 테마, 언어 토글, 항상위) 포함
- **다국어(i18n)**: 영어(en, 기본값)/한국어(ko) 지원. `settingsStore.language`로 관리, `localStorage`에 저장. TitleBar의 Languages 아이콘으로 토글. `useTranslation()` hook으로 컴포넌트에서 사용
- **일감 등록/수정**: IssueEditModal 컴포넌트. BottomBar의 FilePlus 버튼(새 일감) 또는 IssueDetail의 수정 버튼으로 열림. 프로젝트/트래커/상태/우선순위/담당자 등 선택 가능. 프로젝트 멤버는 `/projects/{id}/memberships.json`으로 조회. 수정 모드에서 description은 API가 반환하는 원본 source(Textile/Markdown)를 그대로 노출하여 편집한다 — Redmine 웹 편집 화면과 동일한 동작. (이전에는 `stripHtml()`로 태그를 제거했으나 Textile 소스에 섞인 HTML 태그까지 지우면서 테이블 등 구조가 파괴되어 제거됨). 담당자가 그룹 멤버십 등으로 memberships API에 없을 경우 현재 담당자를 멤버 목록에 추가. 담당자 필드는 `FilterEditor`에서 export한 `SearchableSelect`를 재사용하여 검색 가능. 담당자 옵션은 `project members + allVisibleIssues의 assigned_to`를 병합하여 memberships API가 비어있어도 기존 담당자들로 fallback
- **MarkupEditor**: `common/MarkupEditor.tsx`. description 편집용 **자체 구현 contenteditable WYSIWYG 에디터** (외부 에디터 라이브러리 없음). 사용자는 Textile 태그를 직접 입력하지 않고 서식을 눈으로 보며 편집한다.
  - **툴바**: 굵게, 기울임, 밑줄, 취소선, 인라인 코드, 제목 드롭다운(Paragraph/H1~H6), 글머리기호/번호매기기 목록, 인용, 코드블록, 링크, 테이블(그리드 피커), 수평선. 커서가 테이블 내부일 때 테이블 컨트롤(행/열 추가·삭제, 정렬, 병합, 헤더 행 토글, 테이블 삭제) 자동 표시
  - **외부 인터페이스는 Textile 문자열**: `value`/`onChange` 모두 Textile. `IssueEditModal`은 Textile만 주고받으므로 저장 경로와 100% 호환
  - **내부 변환 파이프라인**:
    - 로드: `parseRedmineMarkup()`으로 Textile(또는 기존 HTML) → HTML → contenteditable `innerHTML`에 주입
    - 저장(매 input/변경마다): editor `innerHTML` → `htmlToTextile()` (`src/lib/htmlToTextile.ts`) → `onChange()`
  - **외부 value 변경 동기화**: `useLayoutEffect`로 value와 `lastEmittedRef`를 비교. 자체 `onChange` 이후 상위가 같은 값으로 다시 내려주면 재주입 스킵. 다른 이슈로 모달 재오픈 시 외부 value가 바뀌면 재주입 (`initializedRef`로 최초 로드 보장)
  - **Enter 처리**: `beforeinput`의 `insertParagraph`를 가로채 브라우저 기본 동작 대신 직접 블록 분할. 일반 블록은 새 `<p>` 생성(헤딩 뒤 Enter면 새 블록은 `<p>`, 헤딩 연속 생성 방지), 리스트 안이면 새 `<li>`(빈 `<li>`에서 Enter 시 리스트 탈출해 `<p>`로), 테이블 셀/PRE 안이면 `<br>` 삽입. `insertLineBreak`(Shift+Enter)는 항상 `<br>`만 삽입
  - **Tab 처리**: 리스트 안에서 들여쓰기/내어쓰기(중첩 리스트 depth 변경), 테이블 안에서 다음/이전 셀로 이동(맨 끝에서 Tab은 새 행 추가)
  - **IME 안전성**: `compositionstart/end`로 `isComposingRef` 추적. 한글 조합 중에는 커스텀 DOM 조작을 스킵하여 자모 분리 방지
  - **Paste**: `text/plain`만 수용하여 `parseRedmineMarkup()`으로 재파싱 후 삽입. 외부 서식 오염 차단
  - **테이블**: 셀은 `<td>`/`<th>`. 정렬은 `data-align="left|center|right"` + `class="align-*"`, 병합은 `colspan`/`rowspan` 속성으로 표현. 툴바의 그리드 피커(최대 8×10)로 삽입
  - **헤딩 범위**: H1~H6 전체 (웹 레드마인 Textile과 동일)
  - **HTML↔Textile 변환**: `markupParser.ts` (Textile→HTML, 블록 단위 파서)와 `htmlToTextile.ts` (HTML→Textile, DOM walker). 지원: `<strong>/<b>`↔`*`, `<em>/<i>`↔`_`, `<u>`↔`+`, `<s>/<del>/<strike>`↔`-`, `<code>`↔`@`, `<h1-6>`↔`h1-6.`, `<ul>/<ol>` 중첩, `<blockquote>`↔`bq.`, `<pre><code>`↔`<pre>...</pre>` (원문 보존), `<a href>`↔`"text":url`, `<img>`↔`!src!`/`!src(alt)!`, `<hr>`↔`---`, `<br>`↔개행, **테이블**↔`|_. h | | c |` (셀 수정자 `_` 헤더, `<`/`>`/`=` 정렬, `\N` colspan, `/N` rowspan). Textile `bc.` 코드 블록 입력도 지원(파싱 전용)
- **댓글**: IssueDetail 하단의 textarea에서 입력 후 등록. PUT /issues/{id}.json에 notes 필드로 전송
- **외부 링크**: `tauri-plugin-opener`의 `openUrl()`으로 시스템 기본 브라우저 열기. TitleBar에 레드마인 홈 버튼(Globe), IssueDetail 헤더에 해당 일감 웹 URL 버튼(ExternalLink)
- **인증**: Redmine API Key만 사용. `tauri-plugin-store`로 앱 데이터 디렉토리에 저장
- **"변경됨" 감지**: Redmine에 unread API가 없으므로 클라이언트에서 issue별 last_seen_updated_on을 저장/비교
- **Status ID**: 하드코딩하지 않고 `/issue_statuses.json` 조회 후 이름("New"/"In Progress"/"신규"/"진행")으로 매핑
- **Polling**: Off/10s/30s/1m/5m/10m 설정 가능 (기본 1분). `localStorage`에 저장. 새로고침 버튼과 polling 간격 드롭다운은 TitleBar에 위치
- **ViewTabs**: 해야할 일 / 담당 일감 / 보고한 일감 / 완료된 일감 / 완료된 개인 작업 5개 뷰
- **개인 작업**: Redmine 무관한 로컬 개인 작업 관리. `personal_tasks.json`에 저장
- **할일 보드**: "해야할 일" 뷰에서 섹션별 작업 분류. `todo_sections.json`에 저장. 섹션 헤더에 갱신된 일감 개수 badge 표시
- **커스텀 필터**: "해야할 일" 뷰에서 일감 분류값(상태, 우선순위, 트래커, 프로젝트, 담당자, 날짜, 진행률)으로 필터링. 필터별로 독립적인 섹션 구성 저장. 기본 필터("내 일감")는 항상 맨 왼쪽, 삭제 불가. 기본 필터는 assigned_to=me 일감 사용, 커스텀 필터는 사용자가 볼 수 있는 전체 미완료 일감(`allVisibleIssues`)에서 조건 적용
- **커스텀 필터 데이터**: `todo_sections.json`에 `filters`, `activeFilterId`, `filterSections`, `filterSectionItems` 키로 저장. 구 형식(`sections`/`sectionItems`)에서 자동 마이그레이션
- **커스텀 필터 미리보기**: FilterEditor에서 조건 추가/변경 시 실시간으로 매칭되는 일감 제목 리스트 표시 (최대 50건)
- **전체 가시 일감**: `issueStore.allVisibleIssues`에 사용자가 볼 수 있는 모든 미완료 일감 저장. `fetchAllViews()`에서 함께 fetch. 필터 조건 선택지와 커스텀 필터 데이터 소스로 사용
- **캘린더 연동**: 일감 완료예정일 기준 Google Calendar QR 코드 + ICS 파일 다운로드
- **마크업 파싱**: Redmine Textile/HTML → React 컴포넌트 변환 (XSS 방지)
- **데이터 저장**: `tauri-plugin-store` 사용. credentials.json(인증), last_seen.json(읽음 상태), personal_tasks.json(개인 작업), todo_sections.json(할일 보드). 초기화 시 store load는 반드시 직렬화(await)하여 macOS WKWebView IPC 병목 방지
- **WebView2 Cache Busting (Windows only)**: `main.rs`에서 `#[cfg(target_os = "windows")]` 가드 하에 WebView2 시작 전 `EBWebView/` 캐시 디렉토리를 삭제. `build.rs`가 빌드마다 고유 타임스탬프를 주입하고, `last_build` 파일과 비교하여 빌드 변경 시 캐시 초기화. macOS는 WKWebView를 사용하므로 해당 없음
- **크로스 플랫폼**: Windows + macOS 지원. CI에서 matrix 전략으로 양 플랫폼 동시 빌드. macOS는 universal binary(arm64 + x86_64) 생성. 플랫폼별 분기는 `main.rs`(EBWebView 캐시)와 `tray.rs`(좌클릭 동작)에만 존재
- **할일 보드 섹션**: 접기/펼기 지원 (collapsed 상태 영속화). 접기 버튼은 헤더 왼쪽 끝, 삭제 버튼은 오른쪽 끝에 배치하여 오클릭 방지
- **fetchAllViews atomic set()**: `fetchAllViews`는 개별 fetch 함수를 호출하지 않고 직접 API를 호출한 뒤 단일 `set()`으로 모든 상태를 한 번에 업데이트. React 18의 zustand `set()` batching으로 인한 production 빌드 렌더링 race condition 방지. 개별 fetch 함수(`fetchIssues` 등)는 단일 뷰 새로고침용으로 유지

## macOS 알려진 이슈 및 해결

### tray-icon + activationPolicy 문제 (v0.2.0에서 해결)

**증상**: 창 이동 불가, 텍스트 입력 불가, 버튼 클릭 무반응, 강제종료로만 종료 가능

**원인**: Tauri v2는 `tray-icon` feature가 활성화된 경우 macOS에서 자동으로 `NSApp.activationPolicy = .accessory`를 설정한다. 이 상태에서는 앱이 백그라운드 에이전트로 동작하여 창을 `show()`해도 키보드/마우스 이벤트를 전혀 수신하지 못한다.

**해결**:
1. `src-tauri/src/lib.rs` setup에서 `app.set_activation_policy(ActivationPolicy::Regular)` 호출 → 앱을 일반 앱으로 등록 (Dock 아이콘 표시됨)
2. `src-tauri/tauri.conf.json`에서 `decorations: true` → 네이티브 타이틀바로 창 이동 자동 해결

**주의**: `app.handle().show()`나 `activateIgnoringOtherApps(true)`는 이 문제를 해결하지 못한다. `activateIgnoringOtherApps`는 macOS 14(Sonoma)부터 deprecated되어 효과 없음.
