import { useState, useEffect, useRef } from "react";

const FORMATS = [
  { value: "mp4-best", label: "MP4 - najlepsza jakość" },
  { value: "mp4-1080", label: "MP4 - 1080p" },
  { value: "mp4-720", label: "MP4 - 720p" },
  { value: "mp3", label: "MP3 - tylko audio (192kbps)" },
  { value: "m4a", label: "M4A - tylko audio" },
];

export default function App() {
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState("mp4-best");
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => () => clearInterval(pollRef.current), []);

  const reset = () => {
    setStatus(null);
    setProgress(0);
    setError("");
    setJobId(null);
    clearInterval(pollRef.current);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    reset();
    setLoading(true);

    try {
      const res = await fetch("/api/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, format }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Błąd serwera");
        setLoading(false);
        return;
      }
      setJobId(data.job_id);
      setStatus("queued");
      pollStatus(data.job_id);
    } catch {
      setError("Błąd połączenia z serwerem.");
      setLoading(false);
    }
  };

  const pollStatus = (id) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/status/${id}`);
        const data = await res.json();
        setStatus(data.status);
        setProgress(data.progress || 0);
        if (data.status === "ready" || data.status === "error") {
          clearInterval(pollRef.current);
          setLoading(false);
          if (data.status === "error") setError(data.error || "Nieznany błąd.");
        }
      } catch {
        clearInterval(pollRef.current);
        setError("Utracono połączenie z serwerem.");
        setLoading(false);
      }
    }, 1000);
  };

  const statusText = () => {
    switch (status) {
      case "queued": return "W kolejce...";
      case "downloading": return `Pobieranie... ${progress}%`;
      case "processing": return "Przetwarzanie pliku (konwersja)...";
      case "ready": return "Gotowe!";
      default: return "Oczekiwanie...";
    }
  };

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
