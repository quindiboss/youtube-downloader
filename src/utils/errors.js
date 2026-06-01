/**
 * Klasy błędów aplikacji
 * Lepsza obsługa błędów zgodnie z Clean Code
 */

export class NetworkError extends Error {
  constructor(message = "Błąd połączenia z serwerem") {
    super(message);
    this.name = "NetworkError";
  }
}

export class ServerError extends Error {
  constructor(message = "Błąd serwera", statusCode = 500) {
    super(message);
    this.name = "ServerError";
    this.statusCode = statusCode;
  }
}

export class ValidationError extends Error {
  constructor(message = "Nieprawidłowe dane") {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Mapuje błędy na przyjazne komunikaty dla użytkownika
 * @param {Error} error - Obiekt błędu
 * @returns {string} Przyjazny komunikat
 */
export function getUserFriendlyErrorMessage(error) {
  if (error instanceof NetworkError) {
    return "Nie można połączyć się z serwerem. Sprawdź połączenie internetowe.";
  }
  if (error instanceof ServerError) {
    return error.message || "Wystąpił problem po stronie serwera.";
  }
  if (error instanceof ValidationError) {
    return error.message || "Wprowadzone dane są nieprawidłowe.";
  }
  return "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.";
}
