"use client";
import { createContext, useContext, useState, useEffect } from "react";

const UserContext = createContext();
UserContext.displayName = "UserContext";

export const UserProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);

  // Optionally fetch /me on app load to restore user after refresh
  useEffect(() => {
    fetch("http://localhost:5000/api/auth/me", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setCurrentUser(data.user))
      .catch(() => setCurrentUser(null));
  }, []);

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
