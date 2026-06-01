/**
 * Mapowanie statusów na teksty wyświetlane użytkownikowi
 */
export function getStatusText(status, progress) {
  switch (status) {
    case "queued":
      return "W kolejce...";
    case "downloading":
      return `Pobieranie... ${progress}%`;
    case "processing":
      return "Przetwarzanie pliku (konwersja)...";
    case "ready":
      return "Gotowe!";
    default:
      return "Oczekiwanie...";
  }
}
