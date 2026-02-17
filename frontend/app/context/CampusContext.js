"use client";
import { createContext, useContext, useState, useEffect } from "react";

const CampusContext = createContext();
CampusContext.displayName = "CampusContext";

export const CampusProvider = ({ children }) => {
  const [currentCampus, setCurrentCampus] = useState(null);

  useEffect(() => {
    const fetchCampus = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/campus/dashboard", {
          credentials: "include",
        });

        if (!res.ok) {
          setCurrentCampus(null);
          return;
        }

        const data = await res.json();
        setCurrentCampus(data.campus);
      } catch {
        setCurrentCampus(null);
      }
    };

    fetchCampus();
  }, []);

  return (
    <CampusContext.Provider value={{ currentCampus, setCurrentCampus }}>
      {children}
    </CampusContext.Provider>
  );
};

export const useCampus = () => useContext(CampusContext);
