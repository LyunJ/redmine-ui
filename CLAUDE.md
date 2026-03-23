# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Redmine의 사용성 개선을 위한 크로스 플랫폼 데스크톱 클라이언트. System tray 상주 + 글로벌 단축키로 floating 되는 경량 앱.

## Tech Stack

- **Desktop Framework**: Tauri v2 (Rust backend)
- **Frontend**: React + TypeScript + Vite
- **State Management**: Zustand
- **Tauri Plugins**: global-shortcut, store, http
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
  lib.rs    - Tauri 앱 진입점. plugin 등록, global hotkey(Ctrl+Shift+R) 핸들러, tray 초기화
  tray.rs   - System tray 생성. 좌클릭으로 창 show/hide 토글, 우클릭 메뉴(열기/종료)

src/
  App.tsx   - 최상위 컴포넌트. 인증 여부에 따라 LoginForm/IssueList 분기, polling 설정
  stores/   - Zustand stores (authStore, issueStore, settingsStore)
  lib/
    redmineClient.ts - Redmine REST API wrapper. X-Redmine-API-Key header 인증
    dateUtils.ts     - 진행률 계산 유틸
  components/
    layout/   - TitleBar (custom decorations, drag region)
    auth/     - LoginForm (URL + API Key)
    issues/   - IssueList, IssueItem, ProgressBar(block-style), SortControls, PriorityBadge
```

## Key Design Decisions

- **Window**: decorations:false + alwaysOnTop. 닫기 버튼은 hide (tray에서 복원)
- **인증**: Redmine API Key만 사용. `tauri-plugin-store`로 앱 데이터 디렉토리에 저장
- **"변경됨" 감지**: Redmine에 unread API가 없으므로 클라이언트에서 issue별 last_seen_updated_on을 저장/비교
- **Status ID**: 하드코딩하지 않고 `/issue_statuses.json` 조회 후 이름("New"/"In Progress"/"신규"/"진행")으로 매핑
- **Polling**: 60초 간격으로 issue 목록 갱신
