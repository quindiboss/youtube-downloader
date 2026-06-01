import { useState, useEffect } from "react";
import { useDownloader } from "./hooks/useDownloader";
import { FORMATS, CONVERSION_FORMATS, DEFAULT_FORMAT } from "./config/formats";
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
  const [activeTab, setActiveTab] = useState("downloader");
  const [sourceFormat, setSourceFormat] = useState("mp4");
  const [targetFormat, setTargetFormat] = useState("mp3");
  const [conversionFile, setConversionFile] = useState(null);
  const [conversionLoading, setConversionLoading] = useState(false);
  const [conversionError, setConversionError] = useState("");
  const [conversionDownloadUrl, setConversionDownloadUrl] = useState("");

  const { jobId, status, progress, error, loading, startDownload } = useDownloader();
  const videoQualityOptions = FORMATS.filter((option) => option.value.startsWith("mp4"));

  // Mapowanie typów formatów
  const FORMAT_TYPES = {
    mp4: "video",
    mp3: "audio",
    m4a: "audio",
    wav: "audio",
    aac: "audio",
    ogg: "audio",
    flac: "audio",
  };

  // Dostępne formaty do wyboru
  const AVAILABLE_SOURCE_FORMATS = [
    { value: "mp4", label: "MP4 (wideo)" },
    { value: "mp3", label: "MP3 (audio)" },
    { value: "m4a", label: "M4A (audio)" },
    { value: "wav", label: "WAV (audio)" },
    { value: "aac", label: "AAC (audio)" },
    { value: "ogg", label: "OGG (audio)" },
    { value: "flac", label: "FLAC (audio)" },
  ];

  // Filtuj docelowe formaty na podstawie źródłowego
  const getCompatibleTargetFormats = () => {
    const sourceType = FORMAT_TYPES[sourceFormat];
    let available = [];

    if (sourceType === "video") {
      // Z wideo można na wszystkie audio
      available = [
        { value: "mp3", label: "MP3 (audio 192kbps)" },
        { value: "wav", label: "WAV (audio bez utraty)" },
        { value: "m4a", label: "M4A (audio)" },
        { value: "aac", label: "AAC (audio)" },
        { value: "ogg", label: "OGG (audio)" },
        { value: "flac", label: "FLAC (audio bez utraty)" },
      ];
    } else {
      // Z audio można na inne audio
      available = AVAILABLE_SOURCE_FORMATS
        .filter((f) => f.value !== sourceFormat && FORMAT_TYPES[f.value] === "audio")
        .map((f) => ({ value: f.value, label: f.label }));
    }

    return available;
  };

  const compatibleTargets = getCompatibleTargetFormats();

  // Resetuj targetFormat jeśli nie jest kompatybilny
  useEffect(() => {
    const isCompatible = compatibleTargets.some((f) => f.value === targetFormat);
    if (!isCompatible && compatibleTargets.length > 0) {
      setTargetFormat(compatibleTargets[0].value);
    }
  }, [sourceFormat]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const selectedFormat = containerFormat === "mp4" ? videoQuality : containerFormat;
    await startDownload(url, selectedFormat);
  };

  const conversionType = `${sourceFormat}-to-${targetFormat}`;

  const handleConvert = async () => {
    if (!conversionFile) {
      setConversionError("Wybierz plik do konwersji.");
      return;
    }

    setConversionLoading(true);
    setConversionError("");
    setConversionDownloadUrl("");

    const formData = new FormData();
    formData.append("file", conversionFile);
    formData.append("conversionType", conversionType);

    try {
      const response = await fetch("http://localhost:3001/api/convert", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Błąd konwersji.");
      }

      if (data.downloadUrl) {
        setConversionDownloadUrl(data.downloadUrl);
      } else {
        setConversionError("Konwersja zakończona sukcesem, ale brak linku do pobrania.");
      }
    } catch (err) {
      setConversionError(err.message);
    } finally {
      setConversionLoading(false);
    }
  };

  const statusText = () => getStatusText(status, progress);

  return (
    <div className="container">
      <header>
        <h1><i className="fas fa-cloud-download-alt"></i> Multimedia Downloader & Converter</h1>
        <p className="subtitle">Pobierz i konwertuj multimedia z YouTube i TikToka</p>
      </header>

      {/* ZAKŁADKI */}
      <div className="tabs-navigation">
        <button
          className={`tab-btn ${activeTab === "downloader" ? "active" : ""}`}
          onClick={() => setActiveTab("downloader")}
        >
          <i className="fas fa-download"></i> Pobieranie
        </button>
        <button
          className={`tab-btn ${activeTab === "converter" ? "active" : ""}`}
          onClick={() => setActiveTab("converter")}
        >
          <i className="fas fa-exchange-alt"></i> Konwersja
        </button>
      </div>

      <main>
        {/* SEKCJA POBIERANIA */}
        {activeTab === "downloader" && (
          <>
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

              <button type="submit" className="primary-btn" disabled={loading}>
                {loading ? <><i className="fas fa-spinner fa-spin"></i> Przetwarzanie...</> : <><i className="fas fa-download"></i> Pobierz</>}
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
                <p><i className="fas fa-check-circle"></i> Plik gotowy!</p>
                <a className="download-btn" href={`/api/file/${jobId}`}>
                  <i className="fas fa-download"></i> Pobierz plik
                </a>
              </div>
            )}

            {error && <div className="error"><i className="fas fa-exclamation-circle"></i> {error}</div>}
          </>
        )}

        {/* SEKCJA KONWERSJI */}
        {activeTab === "converter" && (
          <>
            <h2 style={{ fontSize: "1.3rem", marginBottom: "15px" }}><i className="fas fa-exchange-alt"></i> Konwerter Formatów</h2>
            <p style={{ opacity: "0.8", marginBottom: "20px" }}>Wybierz format źródłowy i docelowy, następnie wyślij plik</p>

            {/* WYBÓR PLIKU */}
            <div style={{ border: "2px dashed rgba(255, 255, 255, 0.2)", borderRadius: "8px", padding: "20px", textAlign: "center", marginBottom: "20px" }}>
              <label htmlFor="file-upload" style={{ display: "block", marginBottom: "15px", fontWeight: "600" }}>
                <i className="fas fa-folder-open"></i> Wyślij plik do konwersji:
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".mp4,.mp3,.m4a,.wav,.aac,.ogg,.flac"
                onChange={(e) => setConversionFile(e.target.files?.[0] || null)}
                style={{ padding: "10px", cursor: "pointer" }}
              />
              {conversionFile && (
                <p style={{ marginTop: "10px", color: "#2ecc71" }}>
                  <i className="fas fa-check"></i> Wybrany plik: {conversionFile.name}
                </p>
              )}
            </div>

            {/* FORMATY */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "20px" }}>
              {/* FORMAT ŹRÓDŁOWY */}
              <div>
                <label htmlFor="source-format" style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                  <i className="fas fa-file-import"></i> Format Źródłowy
                </label>
                <select
                  id="source-format"
                  value={sourceFormat}
                  onChange={(e) => setSourceFormat(e.target.value)}
                  style={{ width: "100%", padding: "10px" }}
                >
                  {AVAILABLE_SOURCE_FORMATS.map((fmt) => (
                    <option key={fmt.value} value={fmt.value}>
                      {fmt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* FORMAT DOCELOWY */}
              <div>
                <label htmlFor="target-format" style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                  <i className="fas fa-file-export"></i> Format Docelowy
                </label>
                <select
                  id="target-format"
                  value={targetFormat}
                  onChange={(e) => setTargetFormat(e.target.value)}
                  style={{ width: "100%", padding: "10px" }}
                >
                  {compatibleTargets.map((fmt) => (
                    <option key={fmt.value} value={fmt.value}>
                      {fmt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* INFO O KOMPATYBILNOŚCI */}
            <div style={{ padding: "12px", background: "rgba(59, 130, 246, 0.1)", borderLeft: "4px solid #3b82f6", borderRadius: "4px", marginBottom: "20px", opacity: "0.9" }}>
              <p style={{ margin: "0", fontSize: "0.95rem" }}>
                <i className="fas fa-arrow-right"></i> Konwersja: <strong>{sourceFormat.toUpperCase()}</strong> ({FORMAT_TYPES[sourceFormat] === "video" ? "wideo" : "audio"})
                {" → "}
                <strong>{targetFormat.toUpperCase()}</strong> (audio)
              </p>
            </div>

            {/* PRZYCISK */}
            <button
              type="button"
              className="primary-btn"
              onClick={handleConvert}
              disabled={!conversionFile || conversionLoading}
            >
              {conversionLoading ? <><i className="fas fa-spinner fa-spin"></i> Trwa konwersja...</> : <><i className="fas fa-compress"></i> Konwertuj {sourceFormat.toUpperCase()} → {targetFormat.toUpperCase()}</>}
            </button>

            {conversionError && (
              <div style={{ marginTop: "16px", color: "#ff6b6b", fontWeight: "600" }}>
                <i className="fas fa-exclamation-triangle"></i> {conversionError}
              </div>
            )}

            {conversionDownloadUrl && (
              <div style={{ marginTop: "16px", padding: "14px", background: "rgba(34, 197, 94, 0.1)", borderRadius: "8px" }}>
                <p style={{ margin: "0 0 10px 0", fontWeight: "600" }}>
                  <i className="fas fa-check-circle"></i> Konwersja zakończona.
                </p>
                <a className="download-btn" href={conversionDownloadUrl}>
                  <i className="fas fa-download"></i> Pobierz przekonwertowany plik
                </a>
              </div>
            )}

            <p style={{ marginTop: "15px", fontSize: "0.85rem", opacity: "0.7", textAlign: "center" }}>
              <i className="fas fa-lightbulb"></i> Możesz konwertować wideo na audio lub audio na inne formaty audio
            </p>
          </>
        )}
      </main>

      <footer>
        <p><i className="fas fa-code"></i> PROJOPP_AP_Final · React · ver. Final 1.0</p>
        <p className="disclaimer"><i className="fas fa-shield-alt"></i> Pobieraj wyłącznie treści, do których masz prawo.</p>
      </footer>
    </div>
  );
}
