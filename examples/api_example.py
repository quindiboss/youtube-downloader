"""
============================================================
PROJOPP_AP_e3 - YouTube Downloader - Przykład API w Python
Demonstracja integracji z backendem Node.js

Autor: konkowski2
Wersja: 1.00
Język: Python 3
============================================================

Ten plik pokazuje jak można zintegrować aplikację Python
z naszym backendem Node.js do pobierania filmów YouTube.
"""

# ==================== IMPORTY ====================

# Moduł requests do wykonywania żądań HTTP
# Alternatywnie można użyć wbudowanego urllib
import requests

# Moduł time do opóźnień (sleep)
import time

# Moduł re do wyrażeń regularnych (walidacja URL)
import re

# Moduł sys do argumentów wiersza poleceń
import sys

# Typing dla typowania (Python 3.5+)
from typing import Optional, Dict, Callable, Any

# ==================== KONFIGURACJA ====================

# URL backendu Node.js (domyślnie lokalny serwer)
API_URL = "http://localhost:3001"

# Timeout dla żądań HTTP w sekundach
REQUEST_TIMEOUT = 30

# Maksymalny czas oczekiwania na pobranie (5 minut)
MAX_WAIT_TIME = 300

# Dozwolone formaty pobierania
ALLOWED_FORMATS = ["mp4-best", "mp4-1080", "mp4-720", "mp3", "m4a"]


# ==================== KLASA DOWNLOADERA ====================

class YouTubeDownloader:
    """
    Klasa do komunikacji z backendem YouTube Downloader.
    
    Umożliwia:
    - Rozpoczęcie pobierania filmu z YouTube
    - Sprawdzanie statusu pobierania
    - Oczekiwanie na zakończenie z callback'iem postępu
    
    Attributes:
        api_url (str): URL backendu API
        last_error (str): Ostatni komunikat błędu
        
    Example:
        >>> downloader = YouTubeDownloader()
        >>> job_id = downloader.start_download("https://youtube.com/watch?v=xyz", "mp3")
        >>> url = downloader.wait_for_completion(job_id)
    """
    
    def __init__(self, api_url: str = API_URL) -> None:
        """
        Inicjalizacja downloadera.
        
        Args:
            api_url: URL backendu API (domyślnie localhost:3001)
        """
        # Przypisz URL backendu (usuń trailing slash)
        self.api_url = api_url.rstrip("/")
        
        # Inicjalizuj zmienną na ostatni błąd
        self.last_error: Optional[str] = None
        
        # Utwórz sesję requests (reużywa połączenia HTTP)
        self._session = requests.Session()
    
    def start_download(self, youtube_url: str, format: str = "mp4-best") -> Optional[str]:
        """
        Rozpoczyna pobieranie filmu z YouTube.
        
        Args:
            youtube_url: Link do filmu na YouTube
            format: Format docelowy (mp4-best, mp4-1080, mp4-720, mp3, m4a)
            
        Returns:
            ID zadania (string) lub None w przypadku błędu
            
        Raises:
            Nie rzuca wyjątków - błędy zapisywane w last_error
        """
        # Walidacja URL - sprawdź czy to prawidłowy link YouTube
        if not self._is_valid_youtube_url(youtube_url):
            self.last_error = "Nieprawidłowy link YouTube"
            return None
        
        # Walidacja formatu - sprawdź czy jest na liście dozwolonych
        if format not in ALLOWED_FORMATS:
            self.last_error = f"Nieobsługiwany format: {format}"
            return None
        
        # Przygotuj dane do wysłania
        payload = {
            "url": youtube_url,
            "format": format
        }
        
        try:
            # Wykonaj żądanie POST do backendu
            response = self._session.post(
                f"{self.api_url}/api/start",
                json=payload,                # Automatycznie serializuje do JSON
                timeout=REQUEST_TIMEOUT
            )
            
            # Sprawdź czy odpowiedź jest poprawna (kod 2xx)
            if not response.ok:
                # Próbuj odczytać błąd z odpowiedzi
                error_data = response.json()
                self.last_error = error_data.get("error", f"Błąd HTTP {response.status_code}")
                return None
            
            # Odczytaj i zwróć ID zadania
            data = response.json()
            return data.get("job_id")
            
        except requests.RequestException as e:
            # Błąd połączenia (timeout, brak sieci, etc.)
            self.last_error = f"Błąd połączenia: {str(e)}"
            return None
    
    def check_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """
        Sprawdza status zadania pobierania.
        
        Args:
            job_id: ID zadania zwrócone przez start_download()
            
        Returns:
            Słownik ze statusem lub None przy błędzie
            
        Klucze w zwracanym słowniku:
            - status: 'queued', 'downloading', 'processing', 'ready', 'error'
            - progress: 0-100 (procent postępu)
            - error: komunikat błędu (jeśli status == 'error')
            - filename: nazwa pliku (jeśli status == 'ready')
        """
        # Walidacja ID zadania (powinno być 16-znakowym hexem)
        if not re.match(r'^[a-f0-9]{16}$', job_id):
            self.last_error = "Nieprawidłowe ID zadania"
            return None
        
        try:
            # Wykonaj żądanie GET do backendu
            response = self._session.get(
                f"{self.api_url}/api/status/{job_id}",
                timeout=REQUEST_TIMEOUT
            )
            
            if not response.ok:
                error_data = response.json()
                self.last_error = error_data.get("error", f"Błąd HTTP {response.status_code}")
                return None
            
            # Zwróć zdekodowaną odpowiedź
            return response.json()
            
        except requests.RequestException as e:
            self.last_error = f"Błąd połączenia: {str(e)}"
            return None
    
    def wait_for_completion(
        self, 
        job_id: str, 
        progress_callback: Optional[Callable[[str, int], None]] = None
    ) -> Optional[str]:
        """
        Czeka na zakończenie pobierania i zwraca URL do pliku.
        
        Args:
            job_id: ID zadania
            progress_callback: Funkcja wywoływana przy zmianie postępu
                               Przyjmuje (status: str, progress: int)
                               
        Returns:
            URL do pobrania pliku lub None przy błędzie
        """
        # Czas rozpoczęcia oczekiwania
        start_time = time.time()
        
        # Pętla sprawdzająca status
        while True:
            # Sprawdź czy nie przekroczono timeout
            elapsed = time.time() - start_time
            if elapsed > MAX_WAIT_TIME:
                self.last_error = "Przekroczono maksymalny czas oczekiwania"
                return None
            
            # Pobierz aktualny status
            status = self.check_status(job_id)
            
            if status is None:
                return None  # Błąd już zapisany w last_error
            
            # Wywołaj callback z postępem (jeśli podany)
            if progress_callback is not None:
                progress_callback(status["status"], status.get("progress", 0))
            
            # Sprawdź status zadania
            current_status = status["status"]
            
            if current_status == "ready":
                # Sukces - zwróć URL do pliku
                return f"{self.api_url}/api/file/{job_id}"
            
            elif current_status == "error":
                # Błąd - zapisz komunikat
                self.last_error = status.get("error", "Nieznany błąd")
                return None
            
            else:
                # Jeszcze w trakcie - poczekaj sekundę
                time.sleep(1)
    
    def _is_valid_youtube_url(self, url: str) -> bool:
        """
        Waliduje URL YouTube.
        
        Args:
            url: URL do sprawdzenia
            
        Returns:
            True jeśli URL jest prawidłowym linkiem YouTube
        """
        # Wyrażenie regularne dla URL-i YouTube
        # Akceptuje: youtube.com, youtu.be, m.youtube.com
        pattern = r'^(https?://)?(www\.)?(youtube\.com|youtu\.be|m\.youtube\.com)/.+'
        
        # Zwróć wynik dopasowania (case-insensitive)
        return bool(re.match(pattern, url, re.IGNORECASE))
    
    def get_last_error(self) -> Optional[str]:
        """
        Zwraca ostatni komunikat błędu.
        
        Returns:
            Komunikat błędu lub None jeśli nie było błędu
        """
        return self.last_error


# ==================== FUNKCJE POMOCNICZE ====================

def print_progress_bar(status: str, progress: int) -> None:
    """
    Wyświetla pasek postępu w terminalu.
    
    Args:
        status: Aktualny status ('downloading', 'processing', etc.)
        progress: Postęp w procentach (0-100)
    """
    # Oblicz długość wypełnionej części paska
    filled_length = int(20 * progress / 100)
    
    # Utwórz pasek
    bar = '█' * filled_length + '░' * (20 - filled_length)
    
    # Wyświetl pasek (nadpisz poprzednią linię)
    print(f'\r[{bar}] {progress:3d}% - {status}', end='', flush=True)


def main() -> None:
    """
    Główna funkcja programu - demonstracja użycia YouTubeDownloader.
    """
    print("=== YouTube Downloader - Python Client ===\n")
    
    # Utwórz instancję downloadera
    downloader = YouTubeDownloader()
    
    # Pobierz URL z argumentów lub użyj domyślnego
    if len(sys.argv) > 1:
        test_url = sys.argv[1]
    else:
        # Przykładowy URL (zmień na prawdziwy)
        test_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    
    # Pobierz format z argumentów lub użyj domyślnego
    format_type = sys.argv[2] if len(sys.argv) > 2 else "mp3"
    
    print(f"URL: {test_url}")
    print(f"Format: {format_type}\n")
    
    # Rozpocznij pobieranie
    print("Rozpoczynam pobieranie...")
    job_id = downloader.start_download(test_url, format_type)
    
    if job_id is None:
        # Błąd - wyświetl komunikat i zakończ
        print(f"\nBŁĄD: {downloader.get_last_error()}")
        sys.exit(1)
    
    print(f"ID zadania: {job_id}")
    print("Oczekiwanie na zakończenie...\n")
    
    # Czekaj na zakończenie z paskiem postępu
    download_url = downloader.wait_for_completion(job_id, print_progress_bar)
    
    print("\n")  # Nowa linia po pasku postępu
    
    if download_url is not None:
        print("SUKCES! Plik dostępny pod adresem:")
        print(download_url)
    else:
        print(f"BŁĄD: {downloader.get_last_error()}")
        sys.exit(1)


# ==================== PUNKT WEJŚCIA ====================

# Sprawdź czy skrypt uruchomiony bezpośrednio (nie importowany)
if __name__ == "__main__":
    main()
