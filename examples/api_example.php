<?php
/**
 * ============================================================
 * PROJOPP_AP_e3 - YouTube Downloader - Przykład API w PHP
 * Demonstracja integracji z backendem Node.js
 * 
 * Autor: konkowski2
 * Wersja: 1.00
 * Język: PHP
 * ============================================================
 * 
 * Ten plik pokazuje jak można zintegrować aplikację PHP
 * z naszym backendem Node.js do pobierania filmów YouTube.
 */

// ==================== KONFIGURACJA ====================

// URL backendu Node.js (domyślnie lokalny serwer)
// W produkcji zmień na właściwy adres serwera
define('API_URL', 'http://localhost:3001');

// Timeout dla żądań HTTP w sekundach
define('REQUEST_TIMEOUT', 30);

// Maksymalny czas oczekiwania na pobranie (5 minut)
define('MAX_WAIT_TIME', 300);

// ==================== KLASA OBSŁUGI API ====================

/**
 * Klasa YouTubeDownloader
 * 
 * Umożliwia komunikację z backendem Node.js
 * do pobierania filmów z YouTube
 * 
 * @package YouTubeDownloader
 * @version 1.00
 */
class YouTubeDownloader {
    
    // Przechowuje URL backendu
    private string $apiUrl;
    
    // Przechowuje ostatni błąd
    private ?string $lastError = null;
    
    /**
     * Konstruktor klasy
     * 
     * @param string $apiUrl - URL backendu (opcjonalny)
     */
    public function __construct(string $apiUrl = API_URL) {
        // Przypisz URL backendu do właściwości obiektu
        $this->apiUrl = rtrim($apiUrl, '/'); // Usuń trailing slash
    }
    
    /**
     * Rozpoczyna pobieranie filmu z YouTube
     * 
     * @param string $youtubeUrl - Link do filmu na YouTube
     * @param string $format - Format docelowy (mp4-best, mp4-1080, mp4-720, mp3, m4a)
     * @return string|null - ID zadania lub null w przypadku błędu
     * 
     * @example
     * $jobId = $downloader->startDownload('https://youtube.com/watch?v=xyz', 'mp3');
     */
    public function startDownload(string $youtubeUrl, string $format = 'mp4-best'): ?string {
        // Walidacja URL - sprawdź czy to YouTube
        if (!$this->isValidYoutubeUrl($youtubeUrl)) {
            $this->lastError = 'Nieprawidłowy link YouTube';
            return null;
        }
        
        // Walidacja formatu
        $allowedFormats = ['mp4-best', 'mp4-1080', 'mp4-720', 'mp3', 'm4a'];
        if (!in_array($format, $allowedFormats)) {
            $this->lastError = 'Nieobsługiwany format: ' . $format;
            return null;
        }
        
        // Przygotuj dane do wysłania (JSON)
        $postData = json_encode([
            'url' => $youtubeUrl,
            'format' => $format
        ]);
        
        // Wykonaj żądanie POST do backendu
        $response = $this->makeRequest('/api/start', 'POST', $postData);
        
        // Sprawdź czy żądanie się powiodło
        if ($response === null) {
            return null;
        }
        
        // Zdekoduj odpowiedź JSON
        $data = json_decode($response, true);
        
        // Zwróć ID zadania
        return $data['job_id'] ?? null;
    }
    
    /**
     * Sprawdza status zadania pobierania
     * 
     * @param string $jobId - ID zadania zwrócone przez startDownload()
     * @return array|null - Tablica ze statusem lub null przy błędzie
     * 
     * Status zawiera klucze:
     * - status: 'queued', 'downloading', 'processing', 'ready', 'error'
     * - progress: 0-100 (procent postępu)
     * - error: komunikat błędu (jeśli status == 'error')
     * - filename: nazwa pliku (jeśli status == 'ready')
     */
    public function checkStatus(string $jobId): ?array {
        // Walidacja ID zadania (powinno być 16-znakowym hexem)
        if (!preg_match('/^[a-f0-9]{16}$/', $jobId)) {
            $this->lastError = 'Nieprawidłowe ID zadania';
            return null;
        }
        
        // Wykonaj żądanie GET do backendu
        $response = $this->makeRequest('/api/status/' . $jobId, 'GET');
        
        if ($response === null) {
            return null;
        }
        
        // Zwróć zdekodowaną odpowiedź
        return json_decode($response, true);
    }
    
    /**
     * Czeka na zakończenie pobierania i zwraca URL do pliku
     * 
     * @param string $jobId - ID zadania
     * @param callable|null $progressCallback - Funkcja wywoływana przy zmianie postępu
     * @return string|null - URL do pobrania pliku lub null przy błędzie
     */
    public function waitForCompletion(string $jobId, ?callable $progressCallback = null): ?string {
        // Czas rozpoczęcia oczekiwania
        $startTime = time();
        
        // Pętla sprawdzająca status
        while (true) {
            // Sprawdź czy nie przekroczono timeout
            if (time() - $startTime > MAX_WAIT_TIME) {
                $this->lastError = 'Przekroczono maksymalny czas oczekiwania';
                return null;
            }
            
            // Pobierz aktualny status
            $status = $this->checkStatus($jobId);
            
            if ($status === null) {
                return null;
            }
            
            // Wywołaj callback z postępem (jeśli podany)
            if ($progressCallback !== null) {
                $progressCallback($status['status'], $status['progress'] ?? 0);
            }
            
            // Sprawdź czy zakończono
            switch ($status['status']) {
                case 'ready':
                    // Sukces - zwróć URL do pliku
                    return $this->apiUrl . '/api/file/' . $jobId;
                    
                case 'error':
                    // Błąd - zapisz komunikat
                    $this->lastError = $status['error'] ?? 'Nieznany błąd';
                    return null;
                    
                default:
                    // Jeszcze w trakcie - poczekaj sekundę
                    sleep(1);
            }
        }
    }
    
    /**
     * Waliduje URL YouTube
     * 
     * @param string $url - URL do sprawdzenia
     * @return bool - true jeśli URL jest prawidłowy
     */
    private function isValidYoutubeUrl(string $url): bool {
        // Wyrażenie regularne dla URL-i YouTube
        $pattern = '/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|m\.youtube\.com)\/.+/i';
        
        // Zwróć wynik dopasowania
        return (bool) preg_match($pattern, $url);
    }
    
    /**
     * Wykonuje żądanie HTTP do API
     * 
     * @param string $endpoint - Ścieżka endpointu (np. '/api/start')
     * @param string $method - Metoda HTTP ('GET' lub 'POST')
     * @param string|null $data - Dane do wysłania (dla POST)
     * @return string|null - Odpowiedź lub null przy błędzie
     */
    private function makeRequest(string $endpoint, string $method, ?string $data = null): ?string {
        // Pełny URL żądania
        $url = $this->apiUrl . $endpoint;
        
        // Konfiguracja kontekstu HTTP
        $options = [
            'http' => [
                'method' => $method,                    // Metoda HTTP
                'timeout' => REQUEST_TIMEOUT,           // Timeout
                'ignore_errors' => true,                // Nie rzucaj wyjątku przy błędach HTTP
                'header' => 'Content-Type: application/json' // Nagłówek JSON
            ]
        ];
        
        // Dodaj dane dla metody POST
        if ($method === 'POST' && $data !== null) {
            $options['http']['content'] = $data;
        }
        
        // Utwórz kontekst
        $context = stream_context_create($options);
        
        // Wykonaj żądanie
        $response = @file_get_contents($url, false, $context);
        
        // Sprawdź czy żądanie się powiodło
        if ($response === false) {
            $this->lastError = 'Nie można połączyć się z serwerem';
            return null;
        }
        
        return $response;
    }
    
    /**
     * Zwraca ostatni komunikat błędu
     * 
     * @return string|null - Komunikat błędu lub null
     */
    public function getLastError(): ?string {
        return $this->lastError;
    }
}

// ==================== PRZYKŁAD UŻYCIA ====================

// Sprawdź czy skrypt uruchomiony z CLI
if (php_sapi_name() === 'cli') {
    
    echo "=== YouTube Downloader - PHP Client ===\n\n";
    
    // Utwórz instancję downloadera
    $downloader = new YouTubeDownloader();
    
    // Przykładowy URL (zmień na prawdziwy)
    $testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    
    echo "Rozpoczynam pobieranie: $testUrl\n";
    echo "Format: MP3\n\n";
    
    // Rozpocznij pobieranie
    $jobId = $downloader->startDownload($testUrl, 'mp3');
    
    if ($jobId === null) {
        // Błąd - wyświetl komunikat
        echo "BŁĄD: " . $downloader->getLastError() . "\n";
        exit(1);
    }
    
    echo "ID zadania: $jobId\n";
    echo "Oczekiwanie na zakończenie...\n\n";
    
    // Callback do wyświetlania postępu
    $progressCallback = function(string $status, int $progress) {
        // Wyświetl pasek postępu
        $bar = str_repeat('█', (int)($progress / 5));
        $empty = str_repeat('░', 20 - strlen($bar));
        echo "\r[$bar$empty] $progress% - $status";
    };
    
    // Czekaj na zakończenie
    $downloadUrl = $downloader->waitForCompletion($jobId, $progressCallback);
    
    echo "\n\n";
    
    if ($downloadUrl !== null) {
        echo "SUKCES! Plik dostępny pod adresem:\n";
        echo $downloadUrl . "\n";
    } else {
        echo "BŁĄD: " . $downloader->getLastError() . "\n";
        exit(1);
    }
}

?>
