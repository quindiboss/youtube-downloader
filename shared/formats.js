/**
 * Współdzielona konfiguracja formatów
 * Używana przez frontend i backend (DRY)
 */
const FORMATS = [
  { value: "mp4-best", label: "MP4 - najlepsza jakość" },
  { value: "mp4-1080", label: "MP4 - 1080p" },
  { value: "mp4-720", label: "MP4 - 720p" },
  { value: "mp3", label: "MP3 - tylko audio (192kbps)" },
  { value: "m4a", label: "M4A - tylko audio" },
];

const ALLOWED_FORMAT_VALUES = FORMATS.map((f) => f.value);
const DEFAULT_FORMAT = "mp4-best";

// CommonJS export dla Node.js
if (typeof module !== "undefined") {
  module.exports = { FORMATS, ALLOWED_FORMAT_VALUES, DEFAULT_FORMAT };
}

// ES Module export dla frontendu
export { FORMATS, ALLOWED_FORMAT_VALUES, DEFAULT_FORMAT };
