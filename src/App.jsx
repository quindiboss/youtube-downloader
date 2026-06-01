import { useState } from "react";
import { useDownloader } from "./hooks/useDownloader";
import { FORMATS } from "./config/formats";
import { getStatusText } from "./utils/statusUtils";

export default function App() {
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState("mp4-best");
  
  const { jobId, status, progress, error, loading, startDownload } = useDownloader();

  const handleSubmit = async (e) => {
    e.preventDefault();
    await startDownload(url, format);
  };

  const statusText = () => getStatusText(status, progress);

  return (
    <div className="container">
      <header>
        <h1>🎬 YouTube Downloader</h1>
        <p className="subtitle">Pobierz filmy z YouTube w wybranym formacie</p>
      </header>

      <main>
        <form onSubmit={handleSubmit}>
          <label htmlFor="url">Link YouTube:</label>
          <input
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            required
            autoComplete="off"
          />

          <label htmlFor="format">Format:</label>
          <select
            id="format"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
          >
            {FORMATS.map((formatOption) => (
              <option key={formatOption.value} value={formatOption.value}>
                {formatOption.label}
              </option>
            ))}
          </select>

          <button type="submit" disabled={loading}>
            {loading ? "Przetwarzanie..." : "Pobierz"}
          </button>
        </form>

        {status && status !== "ready" && !error && (
          <div className="status">
            <div className="status-text">{statusText()}</div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="progress-percent">{progress}%</div>
          </div>
        )}

        {status === "ready" && jobId && (
          <div className="result">
            <p>✅ Plik gotowy!</p>
            <a className="download-btn" href={`/api/file/${jobId}`}>
              ⬇ Pobierz plik
            </a>
          </div>
        )}

        {error && <div className="error">❌ {error}</div>}
      </main>

      <footer>
        <p>PROJOPP_AP_e1 · React · ver. 0.01 Alpha</p>
        <p className="disclaimer">Pobieraj wyłącznie treści, do których masz prawo.</p>
      </footer>
    </div>
  );
}
