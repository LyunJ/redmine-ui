import { useState, useRef, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Calendar, Download, X } from "lucide-react";
import { buildGoogleCalendarUrl, downloadIcsFile } from "../../lib/calendarUtils";
import type { RedmineIssueDetail } from "../../types/redmine";
import "./CalendarButton.css";

interface CalendarButtonProps {
  issue: RedmineIssueDetail;
}

export function CalendarButton({ issue }: CalendarButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const calendarUrl = buildGoogleCalendarUrl(issue);

  // 모달 외부 클릭 시 닫기
  useEffect(() => {
    if (!isOpen) return;

    const handleClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  return (
    <>
      <button className="calendar-btn" onClick={() => setIsOpen(true)}>
        <Calendar size={14} />
        <span>캘린더 등록</span>
      </button>

      {isOpen && (
        <div className="calendar-modal-overlay">
          <div className="calendar-modal" ref={modalRef}>
            <div className="calendar-modal-header">
              <span className="calendar-modal-title">캘린더에 추가</span>
              <button
                className="calendar-modal-close"
                onClick={() => setIsOpen(false)}
              >
                <X size={14} />
              </button>
            </div>

            <div className="calendar-qr-container">
              <div className="calendar-qr-wrapper">
                <QRCodeSVG value={calendarUrl} size={220} level="H" />
              </div>
              <span className="calendar-qr-hint">
                휴대폰 카메라로 QR 코드를 스캔하면
                <br />
                Google Calendar에 일정이 추가됩니다
              </span>
            </div>

            <hr className="calendar-modal-divider" />

            <button
              className="calendar-ics-btn"
              onClick={() => downloadIcsFile(issue)}
            >
              <Download size={14} />
              <span>.ics 파일 다운로드</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
