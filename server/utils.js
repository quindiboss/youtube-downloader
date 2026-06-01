const path = require("path");
const fs = require("fs");
const { ALLOWED_FORMAT_VALUES } = require("../shared/formats.js");

// Wyrażenie regularne do walidacji URL-i YouTube
const YT_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|m\.youtube\.com)\/(watch|shorts|v|embed|live)?.*/i;

/**
 * Generuje tablicę argumentów dla procesu yt-dlp
 * na podstawie wybranego formatu pobierania
 *
 * @param {string} format - Format docelowy: mp3, m4a, mp4-720, mp4-1080, mp4-best
 * @param {string} outputTemplate - Szablon ścieżki pliku wyjściowego
 * @returns {string[]} Tablica argumentów dla yt-dlp
 */
function buildYtDlpArguments(format, outputTemplate) {
  const baseArguments = [
    "--no-playlist",
    "-o",
    outputTemplate,
    "--newline",
  ];

  if (fs.existsSync(path.join(__dirname, "..", "bin", process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"))) {
    baseArguments.push("--ffmpeg-location", path.join(__dirname, "..", "bin"));
  }

  switch (format) {
    case "mp3":
      return [
        ...baseArguments,
        "-x",
        "--audio-format",
        "mp3",
        "--audio-quality",
        "192K",
      ];

    case "m4a":
      return [
        ...baseArguments,
        "-f",
        "bestaudio[ext=m4a]/bestaudio",
      ];

    case "mp4-720":
      return [
        ...baseArguments,
        "-f",
        "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best[height<=720]",
        "--merge-output-format",
        "mp4",
      ];

    case "mp4-1080":
      return [
        ...baseArguments,
        "-f",
        "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best[height<=1080]",
        "--merge-output-format",
        "mp4",
      ];

    default:
      return [
        ...baseArguments,
        "-f",
        "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "--merge-output-format",
        "mp4",
      ];
  }
}

module.exports = {
  ALLOWED_FORMAT_VALUES,
  YT_REGEX,
  buildYtDlpArguments,
};
