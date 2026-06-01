import { useState } from "react";
import { useDownloader } from "./hooks/useDownloader";
import { FORMATS, DEFAULT_FORMAT } from "./config/formats";
import { getStatusText } from "./utils/statusUtils";

const MAIN_FORMATS = [
  { value: "mp4", label: "MP4 (wideo)" },
  { value: "mp3", label: "MP3 (audio)" },
  { value: "m4a", label: "M4A (audio)" },
];

export default function App() {
  const [url, setUrl] = useState("");
  const [containerFormat, setContainerFormat] = useState("mp4");
  const [videoQuality, setVideoQuality] = useState(DEFAULT_FORMAT);

  const { jobId, status, progress, error, loading, startDownload } = useDownloader();
  const videoQualityOptions = FORMATS.filter((option) => option.value.startsWith("mp4"));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const selectedFormat = containerFormat === "mp4" ? videoQuality : containerFormat;
    await startDownload(url, selectedFormat);
  };

  const statusText = () => getStatusText(status, progress);

  return (
    <div className="container">
      <header>
        <h1>🎬 Multimedia Downloader & Converter</h1>
        <p className="subtitle">Pobierz i konwertuj multimedia z YouTube i TikToka</p>
      </header>

      <main>
        <form onSubmit={handleSubmit}>
          <label htmlFor="url">Link YouTube / TikTok:</label>
          <input
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=... lub https://www.tiktok.com/@user/video/..."
            required
            autoComplete="off"
          />

          <label htmlFor="format">Format:</label>
          <select
            id="format"
            value={containerFormat}
            onChange={(e) => setContainerFormat(e.target.value)}
          >
            {MAIN_FORMATS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {containerFormat === "mp4" ? (
            <div className="quality-picker">
              <p>Wybierz jakość wideo:</p>
              <div className="quality-buttons">
                {videoQualityOptions.map((qualityOption) => (
                  <button
                    type="button"
                    key={qualityOption.value}
                    className={
                      videoQuality === qualityOption.value
                        ? "quality-option selected"
                        : "quality-option"
                    }
                    onClick={() => setVideoQuality(qualityOption.value)}
                  >
                    {qualityOption.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="quality-picker audio-note">
              <p>Wybrano format audio. Jakość wideo nie dotyczy.</p>
            </div>
          )}

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
        <p>PROJOPP_AP_Final · React · ver. Final 1.0</p>
        <p className="disclaimer">Pobieraj wyłącznie treści, do których masz prawo.</p>
      </footer>
    </div>
  );
}
