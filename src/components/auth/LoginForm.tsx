import { useState } from "react";
import { useAuthStore } from "../../stores/authStore";
import { Loader2 } from "lucide-react";
import "./LoginForm.css";

export function LoginForm() {
  const { login, isLoading, error } = useAuthStore();
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !apiKey.trim()) return;
    login(url.trim(), apiKey.trim());
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">Redmine UI</h2>
        <p className="login-subtitle">Redmine 서버에 연결하세요</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label htmlFor="url">Redmine URL</label>
            <input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://redmine.example.com"
              required
              autoFocus
            />
          </div>

          <div className="login-field">
            <label htmlFor="apiKey">API Key</label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="내 계정 > API 접근 키"
              required
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <button
            type="submit"
            className="login-btn"
            disabled={isLoading || !url.trim() || !apiKey.trim()}
          >
            {isLoading ? <Loader2 size={16} className="spin" /> : "연결"}
          </button>
        </form>
      </div>
    </div>
  );
}
