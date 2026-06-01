/**
 * PROJOPP_AP_Final - Konwerter formatów
 * Obsługuje konwersję między różnymi formatami audio/wideo
 * Obsługiwane formaty: MP4, MP3, M4A, WAV, AAC, OGG, FLAC
 */

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

// Detektuj dostęp do FFmpeg
const isWindows = process.platform === "win32";
const FFMPEG_LOCAL = path.join(__dirname, "..", "bin", isWindows ? "ffmpeg.exe" : "ffmpeg");
const FFMPEG_CMD = fs.existsSync(FFMPEG_LOCAL) ? FFMPEG_LOCAL : "ffmpeg";

// Mapa konwersji formatów
const CONVERSION_MAP = {
  "mp4-to-mp3": { input: "mp4", output: "mp3", codec: "libmp3lame", bitrate: "192k" },
  "mp4-to-wav": { input: "mp4", output: "wav", codec: "pcm_s16le" },
  "mp4-to-m4a": { input: "mp4", output: "m4a", codec: "aac", bitrate: "128k" },
  "mp4-to-aac": { input: "mp4", output: "aac", codec: "aac", bitrate: "128k" },
  "mp4-to-ogg": { input: "mp4", output: "ogg", codec: "libvorbis", bitrate: "128k" },
  "mp4-to-flac": { input: "mp4", output: "flac", codec: "flac" },
  "mp3-to-wav": { input: "mp3", output: "wav", codec: "pcm_s16le" },
  "mp3-to-m4a": { input: "mp3", output: "m4a", codec: "aac", bitrate: "128k" },
  "mp3-to-aac": { input: "mp3", output: "aac", codec: "aac", bitrate: "128k" },
  "mp3-to-ogg": { input: "mp3", output: "ogg", codec: "libvorbis", bitrate: "128k" },
  "mp3-to-flac": { input: "mp3", output: "flac", codec: "flac" },
  "m4a-to-mp3": { input: "m4a", output: "mp3", codec: "libmp3lame", bitrate: "192k" },
  "m4a-to-wav": { input: "m4a", output: "wav", codec: "pcm_s16le" },
  "wav-to-mp3": { input: "wav", output: "mp3", codec: "libmp3lame", bitrate: "192k" },
  "wav-to-m4a": { input: "wav", output: "m4a", codec: "aac", bitrate: "128k" },
};

/**
 * Konwertuje plik z jednego formatu na inny
 * @param {string} inputFile - Ścieżka do pliku wejściowego
 * @param {string} conversionType - Typ konwersji (np. "mp4-to-mp3")
 * @param {string} outputDir - Katalog na plik wynikowy
 * @returns {Promise<{success: boolean, file?: string, error?: string}>}
 */
async function convertFile(inputFile, conversionType, outputDir) {
  return new Promise((resolve) => {
    const conversion = CONVERSION_MAP[conversionType];
    if (!conversion) {
      return resolve({ success: false, error: "Nieznany typ konwersji" });
    }

    const baseName = path.basename(inputFile, path.extname(inputFile));
    const outputFile = path.join(outputDir, `${baseName}_converted.${conversion.output}`);

    // Staw argumenty dla FFmpeg
    const args = [
      "-i", inputFile,
      "-c:a", conversion.codec,
    ];

    if (conversion.bitrate) {
      args.push("-b:a", conversion.bitrate);
    }

    args.push("-y", outputFile);

    const process = spawn(FFMPEG_CMD, args, { windowsHide: true });

    process.on("close", (code) => {
      if (code === 0 && fs.existsSync(outputFile)) {
        resolve({ success: true, file: outputFile });
      } else {
        resolve({ success: false, error: `FFmpeg zakończył się kodem ${code}` });
      }
    });

    process.on("error", (err) => {
      resolve({ success: false, error: err.message });
    });
  });
}

module.exports = {
  convertFile,
  CONVERSION_MAP,
  FFMPEG_CMD,
  ALLOWED_CONVERSION_VALUES: Object.keys(CONVERSION_MAP),
};
