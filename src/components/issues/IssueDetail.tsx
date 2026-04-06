import { useCallback, useEffect, useRef, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useIssueStore } from "../../stores/issueStore";
import { useAuthStore } from "../../stores/authStore";
import { PriorityBadge } from "./PriorityBadge";
import { ProgressBar } from "./ProgressBar";
import { CalendarButton } from "./CalendarButton";
import { ImageViewer } from "../common/ImageViewer";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { formatDate } from "../../lib/dateUtils";
import { parseRedmineMarkup } from "../../lib/markupParser";
import "./IssueDetail.css";

const IMG_SRC_REGEX = /data-original-src="([^"]+)"/g;

function collectImageSources(html: string): string[] {
  const sources: string[] = [];
  let match;
  while ((match = IMG_SRC_REGEX.exec(html)) !== null) {
    sources.push(match[1]);
  }
  return sources;
}

function applyImageMap(html: string, imageMap: Record<string, string>): string {
  return html.replace(
    /<img\s+data-original-src="([^"]*)"([^>]*)\/?>/g,
    (original, src, rest) => {
      const blobUrl = imageMap[src];
      if (blobUrl) return `<img src="${blobUrl}"${rest}/>`;
      return original;
    },
  );
}

export function IssueDetail() {
  const selectedIssue = useIssueStore((s) => s.selectedIssue);
  const isLoadingDetail = useIssueStore((s) => s.isLoadingDetail);
  const clearSelectedIssue = useIssueStore((s) => s.clearSelectedIssue);
  const client = useAuthStore((s) => s.client);
  const baseUrl = useAuthStore((s) => s.baseUrl);
  const [viewerSrc, setViewerSrc] = useState<string | null>(null);
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const blobUrlsRef = useRef<string[]>([]);

  // 이미지 로딩: state 기반으로 blob URL 관리
  useEffect(() => {
    // 이전 blob URL 해제
    blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    blobUrlsRef.current = [];
    setImageMap({});

    if (!selectedIssue || !client) return;

    let cancelled = false;

    // description + journals에서 이미지 소스 수집
    const sources = new Set<string>();
    if (selectedIssue.description) {
      collectImageSources(parseRedmineMarkup(selectedIssue.description)).forEach(
        (s) => sources.add(s),
      );
    }
    for (const j of selectedIssue.journals) {
      if (j.notes?.trim()) {
        collectImageSources(parseRedmineMarkup(j.notes)).forEach((s) =>
          sources.add(s),
        );
      }
    }

    if (sources.size === 0) return;

    Promise.all(
      [...sources].map(async (src) => {
        try {
          return [src, await client.fetchImageAsBlob(src)] as const;
        } catch {
          return null;
        }
      }),
    ).then((results) => {
      if (cancelled) {
        results.forEach((r) => r && URL.revokeObjectURL(r[1]));
        return;
      }
      const map: Record<string, string> = {};
      const urls: string[] = [];
      for (const r of results) {
        if (r) {
          map[r[0]] = r[1];
          urls.push(r[1]);
        }
      }
      blobUrlsRef.current = urls;
      setImageMap(map);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedIssue, client]);

  // 컴포넌트 unmount 시 blob URL 해제
  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const handleImageClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "IMG" && (target as HTMLImageElement).src) {
      setViewerSrc((target as HTMLImageElement).src);
    }
  }, []);

  if (isLoadingDetail) {
    return (
      <div className="issue-detail-loading">
        <Loader2 size={24} className="spin" />
      </div>
    );
  }

  if (!selectedIssue) return null;

  const journals = selectedIssue.journals.filter(
    (j) => j.notes && j.notes.trim() !== "",
  );

  return (
    <div className="issue-detail">
      <div className="issue-detail-header">
        <button className="issue-detail-back" onClick={clearSelectedIssue}>
          <ArrowLeft size={16} />
          <span>목록</span>
        </button>
        {baseUrl && (
          <button
            className="issue-detail-open-web"
            onClick={() => openUrl(`${baseUrl}/issues/${selectedIssue.id}`)}
            title="웹에서 열기"
          >
            <ExternalLink size={13} />
            <span>웹에서 열기</span>
          </button>
        )}
      </div>

      <div className="issue-detail-scroll" onClick={handleImageClick}>
        <div className="issue-detail-title">
          <span className="issue-detail-id">#{selectedIssue.id}</span>
          <h2>{selectedIssue.subject}</h2>
        </div>

        <div className="issue-detail-info">
          <div className="info-row">
            <span className="info-label">상태</span>
            <span className="info-value">{selectedIssue.status.name}</span>
          </div>
          <div className="info-row">
            <span className="info-label">우선순위</span>
            <PriorityBadge priority={selectedIssue.priority} />
          </div>
          <div className="info-row">
            <span className="info-label">담당자</span>
            <span className="info-value">
              {selectedIssue.assigned_to?.name ?? "-"}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">프로젝트</span>
            <span className="info-value">{selectedIssue.project.name}</span>
          </div>
          <div className="info-row">
            <span className="info-label">진행률</span>
            <ProgressBar
              startDate={selectedIssue.start_date}
              dueDate={selectedIssue.due_date}
            />
          </div>
          <div className="info-row">
            <span className="info-label">시작일</span>
            <span className="info-value">
              {formatDate(selectedIssue.start_date)}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">완료예정일</span>
            <span className="info-value">
              {formatDate(selectedIssue.due_date)}
            </span>
          </div>
        </div>

        <div className="calendar-actions">
          <CalendarButton issue={selectedIssue} />
        </div>

        {selectedIssue.description && (
          <div className="issue-detail-section">
            <h3 className="section-title">설명</h3>
            <div
              className="issue-description markup-content"
              dangerouslySetInnerHTML={{
                __html: applyImageMap(parseRedmineMarkup(selectedIssue.description), imageMap),
              }}
            />
          </div>
        )}

        {journals.length > 0 && (
          <div className="issue-detail-section">
            <h3 className="section-title">댓글 ({journals.length})</h3>
            <div className="issue-journals">
              {journals.map((journal) => (
                <div key={journal.id} className="journal-item">
                  <div className="journal-header">
                    <span className="journal-user">{journal.user.name}</span>
                    <span className="journal-date">
                      {formatDate(journal.created_on)}
                    </span>
                  </div>
                  <div
                    className="journal-notes markup-content"
                    dangerouslySetInnerHTML={{
                      __html: applyImageMap(parseRedmineMarkup(journal.notes), imageMap),
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {viewerSrc && (
        <ImageViewer src={viewerSrc} onClose={() => setViewerSrc(null)} />
      )}
    </div>
  );
}
