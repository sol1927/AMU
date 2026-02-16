"use client";
import { createContext, useContext, useState, useEffect } from "react";

const CampusContext = createContext();
CampusContext.displayName = "CampusContext";

export const CampusProvider = ({ children }) => {
  const [currentCampus, setCurrentCampus] = useState(null);

  useEffect(() => {
    fetch("http://localhost:5000/api/campus/dashboard", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => setCurrentCampus(data.campus))
      .catch(() => setCurrentCampus(null));
  }, []);

  return (
    <CampusContext.Provider value={{ currentCampus, setCurrentCampus }}>
      {children}
    </CampusContext.Provider>
  );
};

export const useCampus = () => useContext(CampusContext);
