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
  const [currentUser, setCurrentUser] = useState(null);

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
    fetchUser();
  }, [fetchUser]);

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
