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

const CONVERSION_FORMATS = [
  { value: "mp4-to-mp3", label: "MP4 → MP3" },
  { value: "mp4-to-wav", label: "MP4 → WAV" },
  { value: "mp4-to-m4a", label: "MP4 → M4A" },
  { value: "mp4-to-aac", label: "MP4 → AAC" },
  { value: "mp4-to-ogg", label: "MP4 → OGG" },
  { value: "mp4-to-flac", label: "MP4 → FLAC" },
  { value: "mp3-to-wav", label: "MP3 → WAV" },
  { value: "mp3-to-m4a", label: "MP3 → M4A" },
  { value: "mp3-to-aac", label: "MP3 → AAC" },
  { value: "mp3-to-ogg", label: "MP3 → OGG" },
  { value: "mp3-to-flac", label: "MP3 → FLAC" },
  { value: "m4a-to-mp3", label: "M4A → MP3" },
  { value: "m4a-to-wav", label: "M4A → WAV" },
  { value: "wav-to-mp3", label: "WAV → MP3" },
  { value: "wav-to-m4a", label: "WAV → M4A" },
];

const ALLOWED_FORMAT_VALUES = FORMATS.map((f) => f.value);
const ALLOWED_CONVERSION_VALUES = CONVERSION_FORMATS.map((f) => f.value);
const DEFAULT_FORMAT = "mp4-best";

// CommonJS export dla Node.js
if (typeof module !== "undefined") {
  module.exports = { FORMATS, CONVERSION_FORMATS, ALLOWED_FORMAT_VALUES, ALLOWED_CONVERSION_VALUES, DEFAULT_FORMAT };
}

// ES Module export dla frontendu
export { FORMATS, CONVERSION_FORMATS, ALLOWED_FORMAT_VALUES, ALLOWED_CONVERSION_VALUES, DEFAULT_FORMAT };
