import { Loader2 } from "lucide-react";

export function LoadingSpinner() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        color: "var(--text-tertiary)",
      }}
    >
      <Loader2 size={24} className="spin" />
    </div>
  );
}
