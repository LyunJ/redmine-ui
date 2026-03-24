# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Redmine의 사용성 개선을 위한 크로스 플랫폼 데스크톱 클라이언트. System tray 상주 + 글로벌 단축키로 floating 되는 경량 앱.

## Tech Stack

- **Desktop Framework**: Tauri v2 (Rust backend)
- **Frontend**: React + TypeScript + Vite
- **State Management**: Zustand
- **Tauri Plugins**: global-shortcut, store, http, process, window-state, opener
- **UI Libraries**: lucide-react (아이콘), date-fns (날짜), qrcode.react (QR 코드)
- **UI**: CSS custom properties 기반 light/dark theme

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
  tray.rs   - System tray 생성. 좌클릭으로 창 show/hide 토글, 우클릭 메뉴(열기/종료)

src/
  App.tsx   - 최상위 컴포넌트. 인증 분기, 상세 뷰 분기, polling 설정
  types/
    redmine.ts - Redmine API 타입 (Issue, User, Status 등)
    app.ts     - 앱 내부 타입 (ViewTab, SortField, Theme, PersonalTask 등)
  stores/
    authStore.ts        - 인증 상태, API Key 저장/복원
    issueStore.ts       - 일감 목록 (뷰별 fetch), 선택된 일감 상세, last_seen 관리
    settingsStore.ts    - 테마, 폴링 간격 설정
    personalTaskStore.ts - 로컬 개인 작업 CRUD
    todoStore.ts        - 할일 보드 섹션/항목 관리
  lib/
    redmineClient.ts - Redmine REST API wrapper. X-Redmine-API-Key header 인증
    dateUtils.ts     - 진행률 계산, 날짜 포맷 유틸
    calendarUtils.ts - Google Calendar URL 생성, ICS 파일 생성
    markupParser.ts  - Redmine Textile/HTML 마크업 → React 렌더링 (XSS 방지)
  styles/
    variables.css - CSS custom properties (light/dark 테마 변수)
    global.css    - 글로벌 스타일
  components/
    layout/   - TitleBar (custom decorations, drag region, 최대화 토글), BottomBar (개인 작업/섹션 추가)
    auth/     - LoginForm (URL + API Key)
    common/   - LoadingSpinner, ImageViewer (확대/축소/드래그)
    issues/   - IssueList, IssueItem, IssueDetail, ProgressBar, SortControls, PriorityBadge,
                ViewTabs, TodoView, AddTaskModal, CalendarButton, PersonalTaskItem, PersonalTaskDetail
```

## Key Design Decisions

- **Window**: decorations:false + alwaysOnTop. 닫기(X) 버튼은 앱 종료. 창 숨기기는 tray 좌클릭 또는 Ctrl+Shift+R
- **인증**: Redmine API Key만 사용. `tauri-plugin-store`로 앱 데이터 디렉토리에 저장
- **"변경됨" 감지**: Redmine에 unread API가 없으므로 클라이언트에서 issue별 last_seen_updated_on을 저장/비교
- **Status ID**: 하드코딩하지 않고 `/issue_statuses.json` 조회 후 이름("New"/"In Progress"/"신규"/"진행")으로 매핑
- **Polling**: Off/10s/30s/1m/5m/10m 설정 가능 (기본 1분). `localStorage`에 저장
- **ViewTabs**: 해야할 일 / 담당 일감 / 보고한 일감 / 완료된 일감 / 완료된 개인 작업 5개 뷰
- **개인 작업**: Redmine 무관한 로컬 개인 작업 관리. `personal_tasks.json`에 저장
- **할일 보드**: "해야할 일" 뷰에서 섹션별 작업 분류. `todo_sections.json`에 저장
- **캘린더 연동**: 일감 완료예정일 기준 Google Calendar QR 코드 + ICS 파일 다운로드
- **마크업 파싱**: Redmine Textile/HTML → React 컴포넌트 변환 (XSS 방지)
- **데이터 저장**: `tauri-plugin-store` 사용. credentials.json(인증), last_seen.json(읽음 상태), personal_tasks.json(개인 작업), todo_sections.json(할일 보드)
