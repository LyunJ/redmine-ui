# Redmine UI

Redmine의 사용성 개선을 위한 크로스 플랫폼 데스크톱 클라이언트입니다.
System tray에 상주하며, 글로벌 단축키(`Ctrl+Shift+R`)로 빠르게 호출할 수 있는 경량 앱입니다.

## Features

- **System Tray 상주** — 백그라운드에서 실행, tray 아이콘으로 제어
- **글로벌 단축키** — `Ctrl+Shift+R`로 어디서든 즉시 호출
- **나에게 할당된 일감** 자동 조회 (신규/진행 상태)
- **변경 감지** — 마지막 확인 이후 업데이트된 일감 표시
- **일감 상세** — 설명, 댓글, 이미지 뷰어, 캘린더 등록
- **자동 갱신** — 10초 ~ 10분 간격 설정 가능
- **Light / Dark 테마** 지원
- **Always on Top** — 다른 창 위에 항상 표시

## Tech Stack

| Layer             | Technology                               |
| ----------------- | ---------------------------------------- |
| Desktop Framework | Tauri v2 (Rust)                          |
| Frontend          | React + TypeScript + Vite                |
| State Management  | Zustand                                  |
| UI                | CSS custom properties (light/dark theme) |

## Installation

[Releases](../../releases) 페이지에서 최신 버전을 다운로드하세요.

| 파일                               | 설명              |
| ---------------------------------- | ----------------- |
| `Redmine.UI_x.x.x_x64-setup.exe` | NSIS Installer    |
| `Redmine.UI_x.x.x_x64_en-US.msi` | Windows Installer |

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/tools/install)
- [Tauri CLI](https://v2.tauri.app/start/prerequisites/)

### Setup

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (Rust + Vite 동시 실행)
npm run tauri dev

# 프로덕션 빌드
npm run tauri build
```

> Rust 빌드 시 SSL 관련 오류가 발생하면: `export CARGO_HTTP_CHECK_REVOKE=false`

## Usage

자세한 사용법은 [MANUAL.md](MANUAL.md)를 참고하세요.

## License

MIT
