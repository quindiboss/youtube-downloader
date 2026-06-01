# PROJOPP_AP_e1 - YouTube Downloader (React)

**Wersja:** 0.5
**Autor:** konkowski2
**Etap:** e1
**Stos:** React (Vite) + Node.js/Express + yt-dlp

## Cel aplikacji

Aplikacja webowa umożliwiająca pobieranie filmów z YouTube w różnych
formatach (MP4 w wybranej rozdzielczości lub samo audio MP3/M4A).
Frontend napisany w **React**, backend w **Node.js (Express)**.

## Jak działa (zasada)

> **Dlaczego potrzebny jest backend?** Przeglądarka nie może bezpośrednio
> pobrać filmu z YouTube – blokują ją CORS i mechanizmy ochrony YouTube.
> Dlatego React (klient) komunikuje się z lokalnym serwerem Node, który
> używa narzędzia `yt-dlp` do faktycznego pobierania.

1. Użytkownik wkleja link YouTube i wybiera format w interfejsie React.
2. React wysyła `POST /api/start` do serwera Express.
3. Serwer uruchamia proces `yt-dlp` jako subprocess i tworzy zadanie z ID.
4. React co sekundę odpytuje `GET /api/status/:id` i wyświetla pasek postępu.
5. Po zakończeniu React pokazuje przycisk z linkiem `GET /api/file/:id`,
   który zwraca gotowy plik. Plik jest usuwany z serwera po wysłaniu.

## Interakcja z użytkownikiem (mechanizm)

- **Pole tekstowe** na link YouTube + walidacja URL.
- **Lista rozwijana z formatami:** MP4 best / 1080p / 720p, MP3 192kbps, M4A.
- **Przycisk "Pobierz"** – wysyła żądanie i przełącza UI w tryb pracy.
- **Pasek postępu** aktualizowany w czasie rzeczywistym (kolejka → pobieranie
  → przetwarzanie → gotowe).
- **Komunikaty błędów** w czytelnej formie.
- **Przycisk "Pobierz plik"** po zakończeniu zapisuje plik lokalnie.

## Stos technologiczny

- **Frontend:** React 18 + Vite + Hooks (`useState`, `useEffect`, `useRef`)
- **Backend:** Node.js + Express + child_process (`spawn yt-dlp`)
- **Narzędzie pobierające:** [yt-dlp](https://github.com/yt-dlp/yt-dlp)
- **Konwersja audio:** FFmpeg (wymagany dla MP3)

## Wymagania

- **Node.js 18+** – https://nodejs.org
- **yt-dlp** w PATH – https://github.com/yt-dlp/yt-dlp/releases
  (Windows: `winget install yt-dlp.yt-dlp` lub pobierz `yt-dlp.exe`)
- **FFmpeg** w PATH (dla MP3) – https://ffmpeg.org/download.html

## Instalacja i uruchomienie

```powershell
npm install
npm run dev
```

Następnie w przeglądarce: **http://localhost:5173**

- Frontend (Vite): http://localhost:5173
- Backend (Express): http://localhost:3001
- Vite proxy-uje żądania `/api/*` na backend automatycznie.

## Struktura projektu

```
konkowski2/
├── package.json
├── vite.config.js
├── index.html
├── README.md
├── .gitignore
├── shared/                 # współdzielona konfiguracja (DRY)
│   └── formats.js
├── src/                    # frontend React
│   ├── main.jsx
│   ├── App.jsx
│   ├── styles.css
│   ├── config/
│   │   └── formats.js      # re-export formatów
│   ├── hooks/
│   │   └── useDownloader.js # custom hook (SRP)
│   └── utils/
│       ├── errors.js       # klasy błędów
│       └── statusUtils.js  # pomocnicze funkcje
├── server/                 # backend Express
│   └── index.js
└── downloads/              # pliki tymczasowe (auto-czyszczone)
```

## Zastrzeżenie prawne

Aplikacja edukacyjna. Pobieraj wyłącznie treści, do których masz prawo.

## Historia wersji

- **0.5** – Etap 5: Debugowanie (YouTube Shorts, memory leak, race condition)
- **0.4** – Etap 4: Prezentacja projektu
- **0.3** – Etap 3: Komentarze w HTML, CSS, JS, PHP, Python
- **0.2** – Etap 2: Clean Code (Meaningful Names, SRP, DRY, JSDoc, Error Handling)
- **0.1** – Etap 1: React + Node backend, pobieranie MP4/MP3/M4A, pasek postępu
