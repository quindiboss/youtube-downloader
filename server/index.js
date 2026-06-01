// Backend Express - obsługa pobierania YouTube przez yt-dlp
// (pobieranie wymaga serwera - przeglądarka sama nie umie pobrać z YT
// z powodu CORS i mechanizmów ochronnych YouTube)

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { spawn } = require("child_process");

const app = express();
const PORT = 3001;

const ROOT = path.join(__dirname, "..");
const DOWNLOAD_DIR = path.join(ROOT, "downloads");
const BIN_DIR = path.join(ROOT, "bin");
if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

// Lokalne binarki - nie wymagają instalacji globalnej
const isWin = process.platform === "win32";
const YT_DLP_LOCAL = path.join(BIN_DIR, isWin ? "yt-dlp.exe" : "yt-dlp");
const FFMPEG_LOCAL = path.join(BIN_DIR, isWin ? "ffmpeg.exe" : "ffmpeg");
const YT_DLP_CMD = fs.existsSync(YT_DLP_LOCAL) ? YT_DLP_LOCAL : "yt-dlp";
const HAS_LOCAL_FFMPEG = fs.existsSync(FFMPEG_LOCAL);

app.use(cors());
app.use(express.json());

const JOBS = new Map();

const YT_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|m\.youtube\.com)\/.+/i;

function ytDlpArgs(format, outputTemplate) {
  const base = ["--no-playlist", "-o", outputTemplate, "--newline"];
  if (HAS_LOCAL_FFMPEG) base.push("--ffmpeg-location", BIN_DIR);
  switch (format) {
    case "mp3":
      return [...base, "-x", "--audio-format", "mp3", "--audio-quality", "192K"];
    case "m4a":
      return [...base, "-f", "bestaudio[ext=m4a]/bestaudio"];
    case "mp4-720":
      return [...base, "-f", "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best[height<=720]", "--merge-output-format", "mp4"];
    case "mp4-1080":
      return [...base, "-f", "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best[height<=1080]", "--merge-output-format", "mp4"];
    default:
      return [...base, "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best", "--merge-output-format", "mp4"];
  }
}

app.post("/api/start", (req, res) => {
  const { url, format } = req.body || {};
  if (!url || !YT_REGEX.test(url)) {
    return res.status(400).json({ error: "Nieprawidłowy link YouTube." });
  }
  const allowed = ["mp4-best", "mp4-1080", "mp4-720", "mp3", "m4a"];
  if (!allowed.includes(format)) {
    return res.status(400).json({ error: "Nieobsługiwany format." });
  }

  const jobId = crypto.randomBytes(8).toString("hex");
  const outTemplate = path.join(DOWNLOAD_DIR, `${jobId}_%(title).80s.%(ext)s`);
  const args = [...ytDlpArgs(format, outTemplate), url];

  JOBS.set(jobId, { status: "queued", progress: 0 });

  // Używa lokalnego yt-dlp z folderu bin/ (lub z PATH jako fallback)
  const proc = spawn(YT_DLP_CMD, args, { windowsHide: true });

  proc.stdout.on("data", (outputChunk) => {
    const stdoutText = outputChunk.toString();
    const currentJob = JOBS.get(jobId);
    if (!currentJob) return;
    
    const progressMatch = stdoutText.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
    if (progressMatch) {
      currentJob.status = "downloading";
      currentJob.progress = parseFloat(progressMatch[1]);
    }
    
    const isProcessingPhase = stdoutText.includes("[ExtractAudio]") || 
                               stdoutText.includes("[Merger]") || 
                               stdoutText.includes("Destination:");
    if (isProcessingPhase) {
      currentJob.status = "processing";
    }
    
    const destinationMatch = stdoutText.match(/\[(?:Merger|ExtractAudio|download)\]\s+(?:Merging formats into|Destination:)\s+"?(.+?)"?\s*$/m);
    if (destinationMatch) {
      currentJob.lastFile = destinationMatch[1];
    }
  });

  proc.stderr.on("data", (chunk) => {
    const job = JOBS.get(jobId);
    if (job) job.lastError = chunk.toString().slice(-500);
  });

  proc.on("error", (err) => {
    const job = JOBS.get(jobId);
    if (job) {
      job.status = "error";
      job.error = err.code === "ENOENT"
        ? "Nie znaleziono yt-dlp. Zainstaluj: https://github.com/yt-dlp/yt-dlp/releases"
        : err.message;
    }
  });

  proc.on("close", (code) => {
    const job = JOBS.get(jobId);
    if (!job) return;
    if (code === 0) {
      const files = fs.readdirSync(DOWNLOAD_DIR).filter((f) => f.startsWith(jobId + "_"));
      if (files.length === 0) {
        job.status = "error";
        job.error = "Pobieranie zakończone, ale plik nie znaleziony.";
      } else {
        files.sort((a, b) => fs.statSync(path.join(DOWNLOAD_DIR, b)).mtimeMs - fs.statSync(path.join(DOWNLOAD_DIR, a)).mtimeMs);
        job.status = "ready";
        job.progress = 100;
        job.filename = files[0];
        job.filepath = path.join(DOWNLOAD_DIR, files[0]);
      }
    } else if (job.status !== "error") {
      job.status = "error";
      job.error = job.lastError || `yt-dlp zakończony kodem ${code}.`;
    }
  });

  res.json({ job_id: jobId });
});

app.get("/api/status/:id", (req, res) => {
  const job = JOBS.get(req.params.id);
  if (!job) return res.status(404).json({ error: "Nieznane zadanie." });
  res.json({
    status: job.status,
    progress: job.progress || 0,
    error: job.error,
    filename: job.filename,
  });
});

app.get("/api/file/:id", (req, res) => {
  const job = JOBS.get(req.params.id);
  if (!job || job.status !== "ready") {
    return res.status(404).json({ error: "Plik niegotowy." });
  }
  res.download(job.filepath, job.filename, (err) => {
    setTimeout(() => {
      try {
        if (fs.existsSync(job.filepath)) fs.unlinkSync(job.filepath);
        JOBS.delete(req.params.id);
      } catch {}
    }, 5000);
  });
});

app.listen(PORT, () => {
  console.log(`[server] Backend działa na http://localhost:${PORT}`);
  console.log(`[server] yt-dlp: ${YT_DLP_CMD}`);
  console.log(`[server] ffmpeg: ${HAS_LOCAL_FFMPEG ? FFMPEG_LOCAL : "(z PATH)"}`);
});
