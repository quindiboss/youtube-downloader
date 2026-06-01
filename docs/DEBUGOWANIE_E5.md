# PROJOPP_AP_e5 - Dokumentacja Debugowania

## 1. Metoda debugowania

**Wybrane narzędzia:**
- **VS Code Debugger** - wbudowany debugger JavaScript/Node.js
- **React DevTools** - inspekcja komponentów React
- **console.log()** - szybkie śledzenie wartości
- **Breakpoints** - pauza wykonania w określonych miejscach

**Konfiguracja VS Code (launch.json):**
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Server",
  "program": "${workspaceFolder}/server/index.js"
}
```

---

## 2. Debugowanie - Bug #1: Błąd walidacji URL

### 2.1 Reprodukcja błędu
**Opis:** Aplikacja odrzuca prawidłowe linki YouTube Shorts
**Kroki reprodukcji:**
1. Wklej link: `https://www.youtube.com/shorts/abc123`
2. Wybierz format MP3
3. Kliknij "Pobierz"
4. **Wynik:** "Nieprawidłowy link YouTube"
5. **Oczekiwany:** Rozpoczęcie pobierania

### 2.2 Wyizolowanie źródła błędu
**Lokalizacja:** `server/index.js` linia 95
**Kod problematyczny:**
```javascript
const YT_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|m\.youtube\.com)\/.+/i;
```
**Analiza:** Regex nie obsługuje ścieżki `/shorts/`

### 2.3 Identyfikacja przyczyny
Wyrażenie regularne wymaga ścieżki zaczynającej się od `/watch`, `/v/` lub podobnej.
YouTube Shorts używa ścieżki `/shorts/ID` która nie jest rozpoznawana.

### 2.4 Usunięcie defektu
**Poprawiony regex:**
```javascript
const YT_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|m\.youtube\.com)\/(watch|shorts|v|embed)?.*/i;
```

### 2.5 Weryfikacja naprawy
- ✅ `https://youtube.com/watch?v=xyz` - działa
- ✅ `https://youtube.com/shorts/abc` - działa (NAPRAWIONE)
- ✅ `https://youtu.be/xyz` - działa
- ✅ `https://m.youtube.com/watch?v=xyz` - działa

---

## 3. Debugowanie - Bug #2: Wyciek pamięci przy pollingu

### 3.1 Reprodukcja błędu
**Opis:** Po zamknięciu okna podczas pobierania, interwał pollingu nadal działa
**Kroki reprodukcji:**
1. Rozpocznij pobieranie
2. Zamknij kartę przeglądarki w trakcie
3. W konsoli serwera widać ciągłe żądania

### 3.2 Wyizolowanie źródła
**Lokalizacja:** `src/hooks/useDownloader.js`
**Problem:** Brak cleanup w useEffect

### 3.3 Identyfikacja przyczyny
Hook nie czyści interwału przy odmontowaniu komponentu.

### 3.4 Usunięcie defektu
**Dodano cleanup:**
```javascript
useEffect(() => {
  return () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
  };
}, []);
```

### 3.5 Weryfikacja
- ✅ Zamknięcie karty zatrzymuje polling
- ✅ Brak wycieków pamięci w DevTools

---

## 4. Debugowanie - Bug #3: Race condition przy szybkim klikaniu

### 3.1 Reprodukcja błędu
**Opis:** Wielokrotne kliknięcie "Pobierz" tworzy duplikaty zadań

### 3.2 Wyizolowanie źródła
**Lokalizacja:** `src/hooks/useDownloader.js` - funkcja `startDownload`

### 3.3 Identyfikacja przyczyny
Brak blokady przycisku podczas oczekiwania na odpowiedź serwera.

### 3.4 Usunięcie defektu
**Dodano guard:**
```javascript
const startDownload = useCallback(async (url, format) => {
  if (loading) return false; // GUARD - zapobiega duplikatom
  resetState();
  setLoading(true);
  // ...
}, [loading, resetState, pollJobStatus]);
```

### 3.5 Weryfikacja
- ✅ Wielokrotne kliknięcie tworzy tylko jedno zadanie
- ✅ Przycisk jest zablokowany podczas przetwarzania

---

## 5. Podsumowanie debugowania

| Bug | Lokalizacja | Status |
|-----|-------------|--------|
| Walidacja YouTube Shorts | server/index.js | ✅ Naprawiony |
| Wyciek pamięci polling | useDownloader.js | ✅ Naprawiony |
| Race condition | useDownloader.js | ✅ Naprawiony |

**Wersja po debugowaniu:** 0.5
