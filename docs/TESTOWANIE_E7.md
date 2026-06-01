# PROJOPP_AP_e7 - Dokumentacja testowania

## Metody testowania

1. Unit testy backendu
2. Ręczne testy funkcjonalne aplikacji

## Plan testów

1. Wybór metody/testu:
   - **Unit testy**: sprawdzenie logiki generowania argumentów dla `yt-dlp` oraz walidacji URL.
   - **Test funkcjonalny**: manualna weryfikacja pobierania pliku i działania interfejsu.

2. Zaplanowanie testu:
   - Stworzyć moduł `server/utils.js` z funkcją `buildYtDlpArguments` i wyrażeniem `YT_REGEX`.
   - Napisać testy w `server/utils.test.js` za pomocą `vitest`.
   - Sprawdzić, że aplikacja akceptuje poprawne linki YouTube i odrzuca inne.
   - Przetestować ręcznie pobieranie `MP4`, `MP3`, `M4A` oraz przyciski wyboru jakości.

3. Implementacja testu:
   - Dodano `vitest` do `package.json`.
   - Stworzono plik `server/utils.test.js`.
   - Zrefaktoryzowano `server/index.js`, aby korzystał z modułu `server/utils.js`.

4. Wykonanie testu:
   - Uruchomiono `npm test`.
   - Wynik: testy jednostkowe wykonane poprawnie.
   - Manualnie przetestowano działanie pola `Format` i przycisków jakości w interfejsie.

5. Ukończenie testu:
   - Dokumentacja testów zapisana w `docs/TESTOWANIE_E7.md`.
   - Aplikacja wersja `0.7`, etap `e7`.

## Weryfikacja po testach

- Zmiany przeglądnięto i zatwierdzono w kodzie.
- Zaktualizowano dokumentację w `README.md` oraz dodano pliki testów.
- Testy unitowe są dostępne w `server/utils.test.js`.

## Wyniki

- Testy przeszły pomyślnie.
- Aplikacja ma teraz oddzielną warstwę logiki testowalnej backendu.
- Etap 7 został zakończony i opublikowany jako wersja `0.7`.
