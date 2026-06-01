/**
 * ============================================================
 * PROJOPP_AP_e3 - YouTube Downloader - Backend Server
 * Serwer Express.js obsługujący pobieranie filmów z YouTube
 * 
 * Autor: konkowski2
 * Wersja: 1.00
 * Język: JavaScript (Node.js)
 * ============================================================
 * 
 * DLACZEGO POTRZEBNY JEST BACKEND?
 * Przeglądarka nie może bezpośrednio pobierać filmów z YouTube
 * z powodu polityki CORS (Cross-Origin Resource Sharing) oraz
 * mechanizmów ochronnych YouTube. Backend obchodzi te ograniczenia.
 */

// ==================== IMPORTY MODUŁÓW ====================

// Express - framework webowy do tworzenia serwerów HTTP
// Umożliwia łatwe definiowanie routingu i middleware
const express = require("express");

// CORS - middleware do obsługi Cross-Origin Resource Sharing
// Pozwala frontendowi (localhost:5173) komunikować się z backendem (localhost:3001)
const cors = require("cors");

// Path - moduł Node.js do operacji na ścieżkach plików
// Zapewnia kompatybilność między systemami (Windows/Linux/Mac)
const path = require("path");

// FS - moduł Node.js do operacji na systemie plików
// Używany do tworzenia katalogów, czytania i usuwania plików
const fs = require("fs");

// Crypto - moduł do generowania bezpiecznych losowych wartości
// Używany do tworzenia unikalnych identyfikatorów zadań
const crypto = require("crypto");

// Child Process - moduł do uruchamiania zewnętrznych programów
// spawn() uruchamia yt-dlp jako osobny proces
const { spawn } = require("child_process");

// Import współdzielonej konfiguracji formatów (zasada DRY)
const { ALLOWED_FORMAT_VALUES } = require("../shared/formats.js");
const { YT_REGEX, buildYtDlpArguments } = require("./utils.js");

// ==================== KONFIGURACJA SERWERA ====================

// Utworzenie instancji aplikacji Express
const app = express();

// Port na którym nasłuchuje serwer backend
const PORT = 3001;

// ==================== ŚCIEŻKI KATALOGÓW ====================

// Katalog główny projektu (jeden poziom wyżej od /server)
const ROOT = path.join(__dirname, "..");

// Katalog na pobrane pliki (tymczasowe)
const DOWNLOAD_DIR = path.join(ROOT, "downloads");

// Katalog z binariami (yt-dlp.exe, ffmpeg.exe)
const BIN_DIR = path.join(ROOT, "bin");

// Tworzenie katalogu downloads jeśli nie istnieje
// recursive: true - tworzy też katalogi nadrzędne jeśli potrzeba
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

// ==================== KONFIGURACJA BINAREK ====================

// Wykrywanie systemu operacyjnego
// process.platform zwraca 'win32' dla Windows, 'linux' dla Linux, 'darwin' dla macOS
const isWindows = process.platform === "win32";

// Ścieżki do lokalnych binarek (dla Windows dodajemy .exe)
const YT_DLP_LOCAL = path.join(BIN_DIR, isWindows ? "yt-dlp.exe" : "yt-dlp");
const FFMPEG_LOCAL = path.join(BIN_DIR, isWindows ? "ffmpeg.exe" : "ffmpeg");

// Użyj lokalnego yt-dlp jeśli istnieje, w przeciwnym razie szukaj w PATH
const YT_DLP_CMD = fs.existsSync(YT_DLP_LOCAL) ? YT_DLP_LOCAL : "yt-dlp";

// Flaga czy lokalny FFmpeg jest dostępny (potrzebny do MP3)
const HAS_LOCAL_FFMPEG = fs.existsSync(FFMPEG_LOCAL);

// ==================== MIDDLEWARE EXPRESS ====================

// Włączenie CORS - pozwala na żądania z innych domen (frontend)
app.use(cors());

// Parser JSON - automatycznie parsuje body żądań jako JSON
app.use(express.json());

// ==================== PRZECHOWYWANIE ZADAŃ ====================

// Map do przechowywania informacji o zadaniach pobierania
// Klucz: jobId (string), Wartość: obiekt z informacjami o zadaniu
const JOBS = new Map();

// ==================== ENDPOINT: START POBIERANIA ====================

/**
 * POST /api/start
 * Rozpoczyna nowe zadanie pobierania
 * 
 * Body: { url: string, format: string }
 * Response: { job_id: string }
 */
app.post("/api/start", (req, res) => {
  // Destrukturyzacja parametrów z body żądania
  const { url, format } = req.body || {};
  
  // Walidacja URL - sprawdź czy to prawidłowy link YouTube
  if (!url || !YT_REGEX.test(url)) {
    return res.status(400).json({ error: "Nieprawidłowy link YouTube." });
  }
  
  // Walidacja formatu - sprawdź czy jest na liście dozwolonych
  if (!ALLOWED_FORMAT_VALUES.includes(format)) {
    return res.status(400).json({ error: "Nieobsługiwany format." });
  }

  // Wygeneruj unikalny identyfikator zadania (16 znaków hex)
  const jobId = crypto.randomBytes(8).toString("hex");
  
  // Szablon nazwy pliku: jobId_tytuł.rozszerzenie (max 80 znaków tytułu)
  const outputTemplate = path.join(DOWNLOAD_DIR, `${jobId}_%(title).80s.%(ext)s`);
  
  // Zbuduj pełną listę argumentów dla yt-dlp
  const ytDlpArguments = [...buildYtDlpArguments(format, outputTemplate), url];

  // Zapisz nowe zadanie w mapie z początkowym statusem
  JOBS.set(jobId, { status: "queued", progress: 0 });

  // Uruchom proces yt-dlp
  // spawn() uruchamia proces asynchronicznie (nie blokuje serwera)
  // windowsHide: true - nie pokazuj okna konsoli na Windows
  const downloadProcess = spawn(YT_DLP_CMD, ytDlpArguments, { windowsHide: true });

  // ==================== OBSŁUGA STDOUT ====================
  // Nasłuchuj na dane wyjściowe procesu (informacje o postępie)
  
  downloadProcess.stdout.on("data", (outputChunk) => {
    // Konwertuj bufor na string
    const stdoutText = outputChunk.toString();
    
    // Pobierz aktualne informacje o zadaniu
    const currentJob = JOBS.get(jobId);
    if (!currentJob) return; // Zadanie mogło zostać usunięte
    
    // Szukaj informacji o postępie pobierania
    // Format: "[download]  45.2% of ..."
    const progressMatch = stdoutText.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
    if (progressMatch) {
      currentJob.status = "downloading";
      currentJob.progress = parseFloat(progressMatch[1]);
    }
    
    // Sprawdź czy jesteśmy w fazie przetwarzania (konwersja/merge)
    const isProcessingPhase = stdoutText.includes("[ExtractAudio]") || 
                               stdoutText.includes("[Merger]") || 
                               stdoutText.includes("Destination:");
    if (isProcessingPhase) {
      currentJob.status = "processing";
    }
    
    // Szukaj ścieżki do pliku wynikowego
    const destinationMatch = stdoutText.match(
      /\[(?:Merger|ExtractAudio|download)\]\s+(?:Merging formats into|Destination:)\s+"?(.+?)"?\s*$/m
    );
    if (destinationMatch) {
      currentJob.lastFile = destinationMatch[1];
    }
  });

  // ==================== OBSŁUGA STDERR ====================
  // Nasłuchuj na błędy procesu
  
  downloadProcess.stderr.on("data", (errorChunk) => {
    const job = JOBS.get(jobId);
    if (job) {
      // Zachowaj ostatnie 500 znaków błędu
      job.lastError = errorChunk.toString().slice(-500);
    }
  });

  // ==================== OBSŁUGA BŁĘDU PROCESU ====================
  // Błąd przy uruchomieniu procesu (np. nie znaleziono yt-dlp)
  
  downloadProcess.on("error", (err) => {
    const job = JOBS.get(jobId);
    if (job) {
      job.status = "error";
      // ENOENT = plik nie istnieje (yt-dlp nie znaleziony)
      job.error = err.code === "ENOENT"
        ? "Nie znaleziono yt-dlp. Zainstaluj: https://github.com/yt-dlp/yt-dlp/releases"
        : err.message;
    }
  });

  // ==================== OBSŁUGA ZAKOŃCZENIA PROCESU ====================
  // Proces zakończył działanie
  
  downloadProcess.on("close", (exitCode) => {
    const job = JOBS.get(jobId);
    if (!job) return;
    
    if (exitCode === 0) {
      // Sukces - znajdź pobrany plik
      const files = fs.readdirSync(DOWNLOAD_DIR)
        .filter((filename) => filename.startsWith(jobId + "_"));
      
      if (files.length === 0) {
        job.status = "error";
        job.error = "Pobieranie zakończone, ale plik nie znaleziony.";
      } else {
        // Posortuj po czasie modyfikacji (najnowszy pierwszy)
        files.sort((a, b) => {
          const statA = fs.statSync(path.join(DOWNLOAD_DIR, a));
          const statB = fs.statSync(path.join(DOWNLOAD_DIR, b));
          return statB.mtimeMs - statA.mtimeMs;
        });
        
        job.status = "ready";
        job.progress = 100;
        job.filename = files[0];
        job.filepath = path.join(DOWNLOAD_DIR, files[0]);
      }
    } else if (job.status !== "error") {
      // Proces zakończył się z błędem
      job.status = "error";
      job.error = job.lastError || `yt-dlp zakończony kodem ${exitCode}.`;
    }
  });

  // Zwróć identyfikator zadania do klienta
  res.json({ job_id: jobId });
});

// ==================== ENDPOINT: STATUS ZADANIA ====================

/**
 * GET /api/status/:id
 * Zwraca aktualny status zadania pobierania
 * 
 * Response: { status, progress, error?, filename? }
 */
app.get("/api/status/:id", (req, res) => {
  const job = JOBS.get(req.params.id);
  
  if (!job) {
    return res.status(404).json({ error: "Nieznane zadanie." });
  }
  
  res.json({
    status: job.status,
    progress: job.progress || 0,
    error: job.error,
    filename: job.filename,
  });
});

// ==================== ENDPOINT: POBIERZ PLIK ====================

/**
 * GET /api/file/:id
 * Zwraca gotowy plik do pobrania
 * Po wysłaniu plik jest usuwany z serwera
 */
app.get("/api/file/:id", (req, res) => {
  const job = JOBS.get(req.params.id);
  
  if (!job || job.status !== "ready") {
    return res.status(404).json({ error: "Plik niegotowy." });
  }
  
  // Wyślij plik do klienta
  res.download(job.filepath, job.filename, (err) => {
    // Po wysłaniu (lub błędzie) poczekaj 5 sekund i usuń plik
    setTimeout(() => {
      try {
        if (fs.existsSync(job.filepath)) {
          fs.unlinkSync(job.filepath); // Usuń plik
        }
        JOBS.delete(req.params.id); // Usuń zadanie z mapy
      } catch (cleanupError) {
        console.error("Błąd czyszczenia:", cleanupError);
      }
    }, 5000);
  });
});

// ==================== URUCHOMIENIE SERWERA ====================

app.listen(PORT, () => {
  console.log(`[server] Backend działa na http://localhost:${PORT}`);
  console.log(`[server] yt-dlp: ${YT_DLP_CMD}`);
  console.log(`[server] ffmpeg: ${HAS_LOCAL_FFMPEG ? FFMPEG_LOCAL : "(z PATH)"}`);
});
