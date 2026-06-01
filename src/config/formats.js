/**
 * Dostępne formaty pobierania
 * Wydzielone do osobnego pliku zgodnie z SRP
 */
export const FORMATS = [
  { value: "mp4-best", label: "MP4 - najlepsza jakość" },
  { value: "mp4-1080", label: "MP4 - 1080p" },
  { value: "mp4-720", label: "MP4 - 720p" },
  { value: "mp3", label: "MP3 - tylko audio (192kbps)" },
  { value: "m4a", label: "M4A - tylko audio" },
];

export const DEFAULT_FORMAT = "mp4-best";
