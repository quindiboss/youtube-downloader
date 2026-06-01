import { useState, useRef, useCallback, useEffect } from "react";
import { NetworkError, ServerError, getUserFriendlyErrorMessage } from "../utils/errors";

/**
 * Custom hook do obsługi pobierania plików z YouTube
 * Wydzielony zgodnie z zasadą Single Responsibility
 */
export function useDownloader() {
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const pollIntervalRef = useRef(null);

  // [BUG FIX] Cleanup przy odmontowaniu - zapobiega wyciekom pamięci
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  const resetState = useCallback(() => {
    setStatus(null);
    setProgress(0);
    setError("");
    setJobId(null);
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const pollJobStatus = useCallback((id) => {
    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/status/${id}`);
        
        if (!response.ok) {
          throw new ServerError("Błąd sprawdzania statusu", response.status);
        }
        
        const data = await response.json();
        
        setStatus(data.status);
        setProgress(data.progress || 0);
        
        if (data.status === "ready" || data.status === "error") {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
          setLoading(false);
          if (data.status === "error") {
            setError(data.error || "Nieznany błąd pobierania.");
          }
        }
      } catch (err) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
        
        const friendlyMessage = err instanceof ServerError 
          ? getUserFriendlyErrorMessage(err)
          : getUserFriendlyErrorMessage(new NetworkError());
        
        setError(friendlyMessage);
        setLoading(false);
      }
    }, 1000);
  }, []);

  const startDownload = useCallback(async (url, format) => {
    // [BUG FIX] Guard przeciw race condition - zapobiega duplikatom zadań
    if (loading) return false;
    
    resetState();
    setLoading(true);

    try {
      const response = await fetch("/api/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, format }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new ServerError(data.error || "Błąd serwera", response.status);
      }
      
      setJobId(data.job_id);
      setStatus("queued");
      pollJobStatus(data.job_id);
      return true;
    } catch (err) {
      const friendlyMessage = err instanceof ServerError
        ? getUserFriendlyErrorMessage(err)
        : getUserFriendlyErrorMessage(new NetworkError());
      
      setError(friendlyMessage);
      setLoading(false);
      return false;
    }
  }, [loading, resetState, pollJobStatus]);

  return {
    jobId,
    status,
    progress,
    error,
    loading,
    startDownload,
    resetState,
  };
}
