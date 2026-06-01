import { useState, useRef, useCallback } from "react";

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
        const data = await response.json();
        
        setStatus(data.status);
        setProgress(data.progress || 0);
        
        if (data.status === "ready" || data.status === "error") {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
          setLoading(false);
          if (data.status === "error") {
            setError(data.error || "Nieznany błąd.");
          }
        }
      } catch {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
        setError("Utracono połączenie z serwerem.");
        setLoading(false);
      }
    }, 1000);
  }, []);

  const startDownload = useCallback(async (url, format) => {
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
        setError(data.error || "Błąd serwera");
        setLoading(false);
        return false;
      }
      
      setJobId(data.job_id);
      setStatus("queued");
      pollJobStatus(data.job_id);
      return true;
    } catch {
      setError("Błąd połączenia z serwerem.");
      setLoading(false);
      return false;
    }
  }, [resetState, pollJobStatus]);

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
