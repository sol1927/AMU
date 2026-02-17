"use client";
import { createContext, useContext, useState, useEffect } from "react";

const UserContext = createContext();
UserContext.displayName = "UserContext";

export const UserProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);

  // Optionally fetch /me on app load to restore user after refresh
  useEffect(() => {
  const fetchUser = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/profile/me", {
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
  };

  fetchUser();
}, []);


  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
