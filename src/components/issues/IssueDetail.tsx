import { useCallback, useEffect, useRef, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useIssueStore } from "../../stores/issueStore";
import { useAuthStore } from "../../stores/authStore";
import { useTranslation } from "../../lib/i18n";
import { PriorityBadge } from "./PriorityBadge";
import { ProgressBar } from "./ProgressBar";
import { CalendarButton } from "./CalendarButton";
import { ImageViewer } from "../common/ImageViewer";
import { ArrowLeft, ExternalLink, Loader2, Pencil, Send } from "lucide-react";
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
  const openEditModal = useIssueStore((s) => s.openEditModal);
  const addComment = useIssueStore((s) => s.addComment);
  const client = useAuthStore((s) => s.client);
  const baseUrl = useAuthStore((s) => s.baseUrl);
  const { t } = useTranslation();

  const [viewerSrc, setViewerSrc] = useState<string | null>(null);
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const blobUrlsRef = useRef<string[]>([]);

  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    blobUrlsRef.current = [];
    setImageMap({});

    if (!selectedIssue || !client) return;

    let cancelled = false;

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

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedIssue) return;
    setIsSubmittingComment(true);
    try {
      await addComment(selectedIssue.id, commentText.trim());
      setCommentText("");
    } finally {
      setIsSubmittingComment(false);
    }
  };

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
          <span>{t("detail.back")}</span>
        </button>
        <div className="issue-detail-header-right">
          <button
            className="issue-detail-edit"
            onClick={() => openEditModal(selectedIssue.id)}
            title={t("detail.edit")}
          >
            <Pencil size={13} />
            <span>{t("detail.edit")}</span>
          </button>
          {baseUrl && (
            <button
              className="issue-detail-open-web"
              onClick={() => openUrl(`${baseUrl}/issues/${selectedIssue.id}`)}
              title={t("detail.openInWeb")}
            >
              <ExternalLink size={13} />
              <span>{t("detail.openInWeb")}</span>
            </button>
          )}
        </div>
      </div>

      <div className="issue-detail-scroll" onClick={handleImageClick}>
        <div className="issue-detail-title">
          <span className="issue-detail-id">#{selectedIssue.id}</span>
          <h2>{selectedIssue.subject}</h2>
        </div>

        <div className="issue-detail-info">
          <div className="info-row">
            <span className="info-label">{t("detail.status")}</span>
            <span className="info-value">{selectedIssue.status.name}</span>
          </div>
          <div className="info-row">
            <span className="info-label">{t("detail.priority")}</span>
            <PriorityBadge priority={selectedIssue.priority} />
          </div>
          <div className="info-row">
            <span className="info-label">{t("detail.assignee")}</span>
            <span className="info-value">
              {selectedIssue.assigned_to?.name ?? "-"}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">{t("detail.project")}</span>
            <span className="info-value">{selectedIssue.project.name}</span>
          </div>
          <div className="info-row">
            <span className="info-label">{t("detail.progress")}</span>
            <ProgressBar
              startDate={selectedIssue.start_date}
              dueDate={selectedIssue.due_date}
            />
          </div>
          <div className="info-row">
            <span className="info-label">{t("detail.startDate")}</span>
            <span className="info-value">
              {formatDate(selectedIssue.start_date)}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">{t("detail.dueDate")}</span>
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
            <h3 className="section-title">{t("detail.description")}</h3>
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
            <h3 className="section-title">{t("detail.comments")} ({journals.length})</h3>
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

        {/* 댓글 입력 */}
        <div className="issue-detail-section">
          <h3 className="section-title">{t("detail.addComment")}</h3>
          <form className="issue-comment-form" onSubmit={handleSubmitComment}>
            <textarea
              className="issue-comment-input"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={t("detail.commentPlaceholder")}
              rows={3}
              disabled={isSubmittingComment}
            />
            <div className="issue-comment-actions">
              <button
                type="submit"
                className="issue-comment-submit"
                disabled={isSubmittingComment || !commentText.trim()}
              >
                {isSubmittingComment ? (
                  <Loader2 size={13} className="spin" />
                ) : (
                  <Send size={13} />
                )}
                <span>{t("detail.submit")}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {viewerSrc && (
        <ImageViewer src={viewerSrc} onClose={() => setViewerSrc(null)} />
      )}
    </div>
  );
}
