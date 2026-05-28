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

const UserContext = createContext();
UserContext.displayName = "UserContext";

const url = process.env.NEXT_PUBLIC_API_URL;

export const UserProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(undefined);
  const [sessionChecked, setSessionChecked] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch(`${url}/profile/me`, {
        credentials: "include",
      });

      if (!res.ok) {
        setCurrentUser(null);
        return;
      }

      const data = await res.json();
      setCurrentUser(data.user);
    } catch {
      setCurrentUser(null);
    }
  }, []);

  useEffect(() => {
    const initSession = async () => {
      if (typeof window !== "undefined") {
        if (!sessionStorage.getItem("tabActiveSession")) {
          try {
            await fetch(`${url}/auth/logout`, {
              method: "POST",
              credentials: "include",
            });
          } catch (err) {
            console.error("Session cleanup failed", err);
          }
          sessionStorage.setItem("tabActiveSession", "true");
        }
      }
      setSessionChecked(true);
    };
    initSession();
  }, []);

  useEffect(() => {
    if (sessionChecked) {
      fetchUser();
    }
  }, [fetchUser, sessionChecked]);

  useEffect(() => {
    if (!currentUser || (currentUser.role !== "cafe" && currentUser.role !== "ticker")) {
      return undefined;
    }

    let heartbeatTimer = null;
    const HEARTBEAT_INTERVAL_MS = 45 * 1000;

    const sendHeartbeat = async () => {
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
      heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    };

    sendHeartbeat();
    startHeartbeat();

    return () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
    };
  }, [currentUser]);

  if (!sessionChecked) {
    return (
      <div className="page-shell flex h-screen w-full items-center justify-center bg-white dark:bg-slate-900">
        <div className="relative">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600 shadow-lg dark:border-slate-800"></div>
          <div className="absolute inset-0 m-auto h-12 w-12 animate-pulse rounded-full bg-blue-100/50 dark:bg-blue-900/30"></div>
        </div>
      </div>
    );
  }

  return (
    <UserContext.Provider
      value={{ currentUser, setCurrentUser, refreshUser: fetchUser }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);

UserProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
