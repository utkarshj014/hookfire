import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";

export function useDemo() {
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [demoStartedBy, setDemoStartedBy] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [visitorId, setVisitorId] = useState<string>("");
  const [clickWarning, setClickWarning] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Initialize visitor ID on mount
  useEffect(() => {
    const initVisitor = async () => {
      let stored = localStorage.getItem("hookfire_visitor_id");
      if (!stored) {
        try {
          const response = await api.post<{ success: boolean; visitorId: string }>("/demo/visitor");
          stored = response.data.visitorId;
          localStorage.setItem("hookfire_visitor_id", stored);
        } catch (err) {
          console.error("Failed to register visitor:", err);
          stored = `Visitor #${Math.floor(Math.random() * 900 + 100)}`;
        }
      }
      setVisitorId(stored);
    };
    initVisitor();
  }, []);

  const checkDemoStatus = useCallback(async () => {
    try {
      const response = await api.get<{
        data: {
          isDemoRunning: boolean;
          startedAt: string | null;
          startedBy: string | null;
          durationSeconds: number;
          bufferSeconds: number;
          currentTime: string;
        };
      }>("/demo/status");
      const {
        isDemoRunning: running,
        startedAt,
        startedBy,
        durationSeconds,
        bufferSeconds,
        currentTime,
      } = response.data.data;

      setIsDemoRunning(running);
      setDemoStartedBy(startedBy);

      if (running && startedAt && currentTime) {
        const startMs = new Date(startedAt).getTime();
        const currentMs = new Date(currentTime).getTime();
        const elapsedSec = Math.max(0, Math.floor((currentMs - startMs) / 1000));
        const totalDur = durationSeconds + bufferSeconds;
        setCountdown(Math.max(0, totalDur - elapsedSec));
        setElapsedSeconds(elapsedSec);
      } else {
        setCountdown(0);
        setElapsedSeconds(0);
      }
    } catch (err) {
      console.error("Error checking demo status:", err);
    }
  }, []);

  // Real-time countdown tick
  useEffect(() => {
    if (!isDemoRunning) {
      setCountdown(0);
      setElapsedSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      setCountdown((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          setIsDemoRunning(false);
          setDemoStartedBy(null);
          return 0;
        }
        return next;
      });
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isDemoRunning]);

  const triggerStartDemo = async () => {
    if (isDemoRunning) {
      setClickWarning(`A demo is already in progress. Please wait ~${countdown} seconds.`);
      setTimeout(() => setClickWarning(null), 5000);
      return false;
    }
    try {
      const response = await api.post("/demo/start", { visitorId });
      const { startedBy, durationSeconds, bufferSeconds } = response.data.data;
      setIsDemoRunning(true);
      setDemoStartedBy(startedBy);
      setCountdown(durationSeconds + bufferSeconds);
      setElapsedSeconds(0);
      return true;
    } catch (err: any) {
      console.error("Failed to start demo:", err);
      const backendMsg = err.response?.data?.message;
      const errData = err.response?.data?.data;
      if (errData?.isDemoRunning) {
        setIsDemoRunning(true);
        setDemoStartedBy(errData.startedBy);
        setCountdown(errData.durationSeconds + errData.bufferSeconds);
      }
      setClickWarning(backendMsg || "Failed to start demo");
      setTimeout(() => setClickWarning(null), 5000);
      return false;
    }
  };

  return {
    isDemoRunning,
    elapsedSeconds,
    demoStartedBy,
    clickWarning,
    countdown,
    visitorId,
    checkDemoStatus,
    triggerStartDemo,
  };
}
