"use client";
import {
  React,
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import PropTypes from "prop-types";

const CampusContext = createContext();
CampusContext.displayName = "CampusContext";

const url = process.env.NEXT_PUBLIC_API_URL;
const CAMPUS_HEARTBEAT_INTERVAL_MS = 45 * 1000;

export const CampusProvider = ({ children }) => {
  const [currentCampus, setCurrentCampus] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCampus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${url}/campus/dashboard`, {
        credentials: "include",
      });

      if (!res.ok) {
        setCurrentCampus(null);
        setLoading(false);
        return;
      }

      const data = await res.json();
      setCurrentCampus(data.campus);
    } catch {
      setCurrentCampus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampus();
  }, [fetchCampus]);

  useEffect(() => {
    if (!currentCampus) return undefined;

    let heartbeatTimer = null;

    const sendHeartbeat = async () => {
      if (document.visibilityState !== "visible") return;

      try {
        await fetch(`${url}/campus/heartbeat`, {
          method: "POST",
          credentials: "include",
        });
      } catch {
        // Ignore transient heartbeat failures and let normal auth flows recover.
      }
    };

    const startHeartbeat = () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      heartbeatTimer = setInterval(sendHeartbeat, CAMPUS_HEARTBEAT_INTERVAL_MS);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        sendHeartbeat();
        startHeartbeat();
      } else if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
    };

    sendHeartbeat();
    startHeartbeat();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentCampus]);

  return (
    <CampusContext.Provider
      value={{
        currentCampus,
        setCurrentCampus,
        loading,
        refreshCampus: fetchCampus,
      }}
    >
      {children}
    </CampusContext.Provider>
  );
};

export const useCampus = () => useContext(CampusContext);

CampusProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
